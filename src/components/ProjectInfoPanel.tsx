import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Edit2, Plus, Save, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import * as Select from '@radix-ui/react-select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../utils/apiClient';
import type { Draft } from '../hooks/useDrafts';

interface ProjectInfoPanelProps {
  activeDraft: Draft;
  updateActiveDraft: (updates: Partial<Omit<Draft, 'id' | 'createdAt'>>) => void;
}

// ── Zod Validation Schema ────────────────────────────────────────────────────
const projectInfoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Song title is required')
    .max(100, 'Title cannot exceed 100 characters'),
  status: z.enum(['Demo', 'In Progress', 'Final', 'Released']),
  writers: z.array(z.string()),
  producers: z.array(z.string()),
  featuredArtists: z.array(z.string()),
});

type ProjectInfoFormValues = z.infer<typeof projectInfoSchema>;

// ── Multi-entry tag input ──────────────────────────────────────────────────
interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (newTags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ label, tags, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commitCurrent = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, tags, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCurrent();
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-ink-muted">
        {label}
      </label>

      {/* Committed tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 bg-paper text-ink text-sm pl-3 pr-1 py-0.5 rounded-full border border-paper-darker"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="w-5 h-5 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper-active rounded-full cursor-pointer transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row with + button */}
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          inputSize="sm"
          type="text"
          aria-label={`Add ${label}`}
          placeholder="Add name…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          spellCheck={false}
        />
        <Button
          size="sm"
          variant={inputValue.trim() ? 'primary' : 'secondary'}
          onClick={commitCurrent}
          disabled={!inputValue.trim()}
          aria-label={`Add ${label}`}
          className="w-8 px-0 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ── Main panel ─────────────────────────────────────────────────────────────
export const ProjectInfoPanel: React.FC<ProjectInfoPanelProps> = ({
  activeDraft,
  updateActiveDraft,
}) => {
  // Inline title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize React Hook Form with Zod resolver
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { isDirty, errors },
  } = useForm<ProjectInfoFormValues>({
    resolver: zodResolver(projectInfoSchema),
    defaultValues: {
      title: activeDraft.title,
      status: (activeDraft.status as any) || 'Demo',
      writers: activeDraft.writers || [],
      producers: activeDraft.producers || [],
      featuredArtists: activeDraft.featuredArtists || [],
    },
  });

  const formTitle = watch('title');

  // Load project metadata from REST API when project opens
  useEffect(() => {
    let isMounted = true;

    async function loadInfo() {
      try {
        const { data: { session } } = await api.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch(`/api/projects/${activeDraft.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            reset({
              title: data.title || '',
              status: data.status || 'Demo',
              writers: Array.isArray(data.writers) ? data.writers : [],
              producers: Array.isArray(data.producers) ? data.producers : [],
              featuredArtists: Array.isArray(data.featured_artists) ? data.featured_artists : [],
            });
          }
        }
      } catch (err) {
        console.error('Error fetching project metadata in panel:', err);
      }
    }

    // Set initial values from prop
    reset({
      title: activeDraft.title,
      status: (activeDraft.status as any) || 'Demo',
      writers: activeDraft.writers || [],
      producers: activeDraft.producers || [],
      featuredArtists: activeDraft.featuredArtists || [],
    });

    loadInfo();

    return () => {
      isMounted = false;
    };
  }, [activeDraft.id, reset]);

  // Sync title changes from activeDraft (Yjs collaboration)
  useEffect(() => {
    if (!isEditingTitle && !isDirty) {
      setValue('title', activeDraft.title);
    }
  }, [activeDraft.title, isEditingTitle, isDirty, setValue]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setIsEditingTitle(false);
    if (e.key === 'Escape') {
      setValue('title', activeDraft.title);
      setIsEditingTitle(false);
    }
  };

  // ── Save handler using handleSubmit from react-hook-form ──────────────────
  const onSubmit = (data: ProjectInfoFormValues) => {
    updateActiveDraft({
      title: data.title,
      status: data.status,
      writers: data.writers,
      producers: data.producers,
      featuredArtists: data.featuredArtists,
    });
    // Reset form states to clean, tracking the newly saved values
    reset(data);
  };

  const statuses = ['Demo', 'In Progress', 'Final', 'Released'] as const;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex-1 flex flex-col min-h-0 bg-transparent text-ink select-none"
    >
      {/* Scrollable form area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Song Title */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink-muted">
            Song title
          </label>
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                {...register('title')}
                ref={(e) => {
                  register('title').ref(e);
                  (titleInputRef as any).current = e;
                }}
                onKeyDown={handleTitleKeyDown}
                onBlur={() => setIsEditingTitle(false)}
                aria-label="Song title"
                className="flex-1 h-9 bg-paper border border-terracotta rounded-xl px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 transition select-text"
                spellCheck={false}
              />
              <Button
                size="sm"
                onClick={() => setIsEditingTitle(false)}
                title="Confirm title"
                aria-label="Confirm title"
                className="w-9 h-9 px-0"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="group w-full text-left flex items-center justify-between px-3 py-2 bg-paper hover:border-ink-light rounded-xl cursor-pointer border border-paper-darker transition-colors"
              title="Click to edit title"
            >
              <span className="font-semibold text-lg text-ink truncate mr-2">
                {formTitle || 'Untitled Song'}
              </span>
              <Edit2 className="w-3.5 h-3.5 text-ink-light group-hover:text-ink transition flex-shrink-0" />
            </button>
          )}
          {errors.title && (
            <span role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1 block">
              {errors.title.message}
            </span>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink-muted">
            Status
          </label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select.Root value={field.value} onValueChange={field.onChange}>
                <Select.Trigger
                  className="w-full h-10 flex items-center justify-between bg-paper border border-paper-darker rounded-xl px-3 text-sm text-ink focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30 transition select-none cursor-pointer hover:border-ink-light"
                  aria-label="Project Status"
                >
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown className="w-4 h-4 text-ink-muted" />
                  </Select.Icon>
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content className="radix-menu-content z-50">
                    <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-paper text-ink cursor-default" />
                    <Select.Viewport className="p-1">
                      {statuses.map((s) => (
                        <Select.Item key={s} value={s} className="radix-menu-item">
                          <Select.ItemText>{s}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check className="w-4 h-4 text-terracotta" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                    <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-paper text-ink cursor-default" />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            )}
          />
        </div>

        {/* Writers */}
        <Controller
          name="writers"
          control={control}
          render={({ field }) => (
            <TagInput label="Writers" tags={field.value} onChange={field.onChange} />
          )}
        />

        {/* Producers */}
        <Controller
          name="producers"
          control={control}
          render={({ field }) => (
            <TagInput label="Producers" tags={field.value} onChange={field.onChange} />
          )}
        />

        {/* Featured Artists */}
        <Controller
          name="featuredArtists"
          control={control}
          render={({ field }) => (
            <TagInput label="Featured Artists" tags={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* ── Sticky Save bar ─────────────────────────────────────────────── */}
      <div className="border-t border-paper-darker p-4 bg-paper-dark flex-shrink-0">
        <Button
          type="submit"
          variant={isDirty ? 'primary' : 'secondary'}
          disabled={!isDirty}
          className="w-full disabled:opacity-100 disabled:text-ink-muted"
        >
          <Save className="w-4 h-4" />
          {isDirty ? 'Save changes' : 'All changes saved'}
        </Button>
      </div>
    </form>
  );
};
