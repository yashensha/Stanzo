// Real-time collaboration room: one Durable Object per project, speaking the y-websocket
// protocol so the existing `WebsocketProvider` + `yCollab` client code works unchanged.
//
// Persistence: the Yjs state lives in this object's storage (authoritative, so reconnecting
// clients merge cleanly instead of duplicating text). On first open it is seeded from the
// project row in D1, and every flush mirrors title/content back to D1 so project lists,
// previews and exports stay current.
import { DurableObject } from 'cloudflare:workers';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { Env } from './index';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_QUERY_AWARENESS = 3;

const STATE_KEY = 'ydoc';
const FLUSH_DELAY_MS = 2000;

export class CollabRoom extends DurableObject<Env> {
  private doc: Y.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private projectId: string | null = null;
  /** Each socket -> the awareness client IDs it controls (removed when it closes). */
  private conns = new Map<WebSocket, Set<number>>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }
    const projectId = request.headers.get('X-Project-Id');
    if (!projectId) return new Response('Missing project', { status: 400 });

    await this.ensureDoc(projectId);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.handleConnection(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async ensureDoc(projectId: string): Promise<void> {
    if (this.doc) return;
    await this.ctx.blockConcurrencyWhile(async () => {
      if (this.doc) return;
      this.projectId = projectId;
      const doc = new Y.Doc();

      const stored = await this.ctx.storage.get<Uint8Array>(STATE_KEY);
      if (stored) {
        Y.applyUpdate(doc, stored);
      } else {
        const row: any = await this.env.songwriting_db
          .prepare('SELECT title, content FROM projects WHERE id = ?')
          .bind(projectId)
          .first();
        doc.transact(() => {
          if (row?.title) doc.getText('title').insert(0, row.title);
          if (row?.content) doc.getText('content').insert(0, row.content);
        });
        await this.ctx.storage.put(STATE_KEY, Y.encodeStateAsUpdate(doc));
      }

      const awareness = new awarenessProtocol.Awareness(doc);
      awareness.setLocalState(null); // the server has no presence of its own

      doc.on('update', (update: Uint8Array, origin: unknown) => {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeUpdate(encoder, update);
        this.broadcast(encoding.toUint8Array(encoder), origin as WebSocket | undefined);
        this.scheduleFlush();
      });

      awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        const changed = added.concat(updated, removed);
        const ids = origin instanceof Object ? this.conns.get(origin as WebSocket) : undefined;
        if (ids) {
          added.forEach((id) => ids.add(id));
          removed.forEach((id) => ids.delete(id));
        }
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
        this.broadcast(encoding.toUint8Array(encoder));
      });

      this.doc = doc;
      this.awareness = awareness;
    });
  }

  private handleConnection(ws: WebSocket): void {
    const doc = this.doc!;
    const awareness = this.awareness!;
    this.conns.set(ws, new Set());

    ws.addEventListener('message', (event) => {
      try {
        const data = event.data;
        if (typeof data === 'string') return;
        const message = new Uint8Array(data as ArrayBuffer);
        const decoder = decoding.createDecoder(message);
        const encoder = encoding.createEncoder();
        const type = decoding.readVarUint(decoder);
        if (type === MESSAGE_SYNC) {
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
          // Only reply when there's a payload beyond the message type byte.
          if (encoding.length(encoder) > 1) this.send(ws, encoding.toUint8Array(encoder));
        } else if (type === MESSAGE_AWARENESS) {
          awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), ws);
        } else if (type === MESSAGE_QUERY_AWARENESS) {
          this.sendAwareness(ws, Array.from(awareness.getStates().keys()));
        }
      } catch (err) {
        console.error('[collab] bad message', err);
      }
    });

    const onClose = () => this.closeConnection(ws);
    ws.addEventListener('close', onClose);
    ws.addEventListener('error', onClose);

    // Start the handshake: ask the client for what we're missing, and share who's here.
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    this.send(ws, encoding.toUint8Array(encoder));
    const states = Array.from(awareness.getStates().keys());
    if (states.length > 0) this.sendAwareness(ws, states);
  }

  private closeConnection(ws: WebSocket): void {
    const ids = this.conns.get(ws);
    if (!ids) return;
    this.conns.delete(ws);
    if (this.awareness && ids.size > 0) {
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(ids), null);
    }
    try { ws.close(); } catch { /* already closed */ }
    if (this.conns.size === 0) void this.flush();
  }

  private sendAwareness(ws: WebSocket, clientIds: number[]): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness!, clientIds));
    this.send(ws, encoding.toUint8Array(encoder));
  }

  private broadcast(message: Uint8Array, except?: WebSocket): void {
    for (const ws of this.conns.keys()) {
      if (ws !== except) this.send(ws, message);
    }
  }

  private send(ws: WebSocket, message: Uint8Array): void {
    try {
      ws.send(message);
    } catch {
      this.closeConnection(ws);
    }
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DELAY_MS);
  }

  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.dirty || !this.doc || !this.projectId) return;
    this.dirty = false;
    const doc = this.doc;
    try {
      await this.ctx.storage.put(STATE_KEY, Y.encodeStateAsUpdate(doc));
      await this.env.songwriting_db
        .prepare('UPDATE projects SET title = ?, content = ? WHERE id = ?')
        .bind(doc.getText('title').toString(), doc.getText('content').toString(), this.projectId)
        .run();
    } catch (err) {
      this.dirty = true; // retry on the next change or disconnect
      console.error('[collab] flush failed', err);
    }
  }
}
