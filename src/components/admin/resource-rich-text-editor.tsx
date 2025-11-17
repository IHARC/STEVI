'use client';

import { startTransition, useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Bold,
  FileCode,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { Icon } from '@/components/ui/icon';

type ResourceRichTextEditorProps = {
  name: string;
  label?: string;
  description?: string;
  defaultValue?: string;
};

export function ResourceRichTextEditor({ name, label, description, defaultValue }: ResourceRichTextEditorProps) {
  const [serialized, setSerialized] = useState(defaultValue ?? '');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [htmlDialogOpen, setHtmlDialogOpen] = useState(false);
  const [htmlSnippet, setHtmlSnippet] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'text-primary underlined underline-offset-4',
        },
      }),
      Placeholder.configure({
        placeholder:
          'Summarize the resource in plain language. Use headings, bullet lists, and links so neighbours can scan updates quickly.',
      }),
    ],
    content: defaultValue ?? '',
    onUpdate({ editor: instance }: { editor: Editor }) {
      setSerialized(instance.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'text-on-surface',
          'prose-headings:mb-3 prose-headings:mt-6 prose-headings:text-on-surface',
          'prose-strong:text-on-surface prose-em:text-on-surface/90 prose-code:text-primary',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-ul:my-4 prose-ol:my-4',
        ),
      },
    },
  });

  useEffect(() => {
    startTransition(() => {
      setSerialized(defaultValue ?? '');
    });
    if (editor && typeof defaultValue === 'string') {
      editor.commands.setContent(defaultValue, false);
    }
  }, [defaultValue, editor]);

  const handleToggleMark = (command: () => void) => {
    if (!editor) {
      return;
    }
    command();
  };

  const handleSetLink = () => {
    if (!editor) {
      return;
    }
    const value = linkUrl.trim();
    if (!value) {
      editor.chain().focus().unsetLink().run();
      setLinkDialogOpen(false);
      return;
    }
    const normalized = normalizeUrl(value);
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    setLinkUrl('');
    setLinkDialogOpen(false);
  };

  const handleInsertHtml = () => {
    if (!editor) {
      return;
    }
    const snippet = htmlSnippet.trim();
    if (snippet) {
      editor.commands.insertContent(snippet);
      setHtmlSnippet('');
    }
    setHtmlDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      {label ? <label className="text-body-md font-medium text-on-surface">{label}</label> : null}
      {description ? <p className="text-label-sm text-on-surface/70">{description}</p> : null}
      <div className="rounded-3xl border border-outline/20 bg-surface-container-low">
        <div className="flex flex-wrap items-center gap-2 border-b border-outline/15 px-3 py-2">
          <Toggle
            type="button"
            size="sm"
            aria-label="Bold"
            pressed={editor?.isActive('bold') ?? false}
            onPressedChange={() =>
              handleToggleMark(() => {
                editor?.chain().focus().toggleBold().run();
              })
            }
          >
            <Icon icon={Bold} size="sm" aria-hidden />
          </Toggle>
          <Toggle
            type="button"
            size="sm"
            aria-label="Italic"
            pressed={editor?.isActive('italic') ?? false}
            onPressedChange={() =>
              handleToggleMark(() => {
                editor?.chain().focus().toggleItalic().run();
              })
            }
          >
            <Icon icon={Italic} size="sm" aria-hidden />
          </Toggle>
          <Toggle
            type="button"
            size="sm"
            aria-label="Underline"
            pressed={editor?.isActive('underline') ?? false}
            onPressedChange={() =>
              handleToggleMark(() => {
                editor?.chain().focus().toggleUnderline().run();
              })
            }
          >
            <Icon icon={UnderlineIcon} size="sm" aria-hidden />
          </Toggle>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Heading"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'font-semibold',
              editor?.isActive('heading', { level: 2 }) ? 'text-primary' : 'text-on-surface/80',
            )}
          >
            H2
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Subheading"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              'font-semibold',
              editor?.isActive('heading', { level: 3 }) ? 'text-primary' : 'text-on-surface/80',
            )}
          >
            H3
          </Button>
          <Toggle
            type="button"
            size="sm"
            aria-label="Bulleted list"
            pressed={editor?.isActive('bulletList') ?? false}
            onPressedChange={() =>
              handleToggleMark(() => {
                editor?.chain().focus().toggleBulletList().run();
              })
            }
          >
            <Icon icon={List} size="sm" aria-hidden />
          </Toggle>
          <Toggle
            type="button"
            size="sm"
            aria-label="Numbered list"
            pressed={editor?.isActive('orderedList') ?? false}
            onPressedChange={() =>
              handleToggleMark(() => {
                editor?.chain().focus().toggleOrderedList().run();
              })
            }
          >
            <Icon icon={ListOrdered} size="sm" aria-hidden />
          </Toggle>
          <Toggle
            type="button"
            size="sm"
            aria-label="Quote"
            pressed={editor?.isActive('blockquote') ?? false}
            onPressedChange={() =>
              handleToggleMark(() => {
                editor?.chain().focus().toggleBlockquote().run();
              })
            }
          >
            <Icon icon={Quote} size="sm" aria-hidden />
          </Toggle>

          <div className="ml-auto flex items-center gap-2">
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="ghost" aria-label="Insert link">
                  <Icon icon={LinkIcon} size="sm" aria-hidden />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Insert link</DialogTitle>
                  <DialogDescription>
                    Paste a full URL so neighbours can open the referenced resource in a new tab.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                  <Input
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://example.ca"
                    autoFocus
                  />
                </div>
                <DialogFooter className="gap-2 sm:space-x-0">
                  <Button type="button" variant="ghost" onClick={() => setLinkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSetLink}
                    aria-label="Apply link"
                  >
                    Apply link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={htmlDialogOpen} onOpenChange={setHtmlDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="ghost" aria-label="Insert HTML">
                  <Icon icon={FileCode} size="sm" aria-hidden />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Embed custom HTML</DialogTitle>
                  <DialogDescription>
                    Paste accessible HTML snippets like iframe embeds. Only trusted hosts will be published.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  value={htmlSnippet}
                  onChange={(event) => setHtmlSnippet(event.target.value)}
                  rows={6}
                  placeholder="<iframe …></iframe>"
                  className="text-body-md"
                />
                <DialogFooter className="gap-2 sm:space-x-0">
                  <Button type="button" variant="ghost" onClick={() => setHtmlDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleInsertHtml}>
                    Insert snippet
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
            >
              <Icon icon={Undo} size="sm" aria-hidden />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
            >
              <Icon icon={Redo} size="sm" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="p-3">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="min-h-[220px] rounded-2xl border border-outline/20 bg-surface p-4 text-body-md text-on-surface/70">
              Loading editor…
            </div>
          )}
        </div>
      </div>
      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.toString();
  } catch {
    return value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
  }
}
