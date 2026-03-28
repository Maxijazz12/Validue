"use client";

import { useState, useCallback, useTransition } from "react";
import Avatar from "@/components/ui/Avatar";
import type { WallComment } from "@/components/dashboard/WallCard";
import { postComment, deleteComment } from "@/app/dashboard/the-wall/[id]/comment-actions";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function WallCommentSection({
  campaignId,
  comments: initialComments,
}: {
  campaignId: string;
  comments: WallComment[];
}) {
  const [localComments, setLocalComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ownComment = localComments.find((c) => c.isOwn);
  const otherComments = localComments.filter((c) => !c.isOwn);
  const displayComments = otherComments.slice(0, 3);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!text.trim() || isPending) return;

      setError(null);
      startTransition(async () => {
        try {
          const result = await postComment(campaignId, text.trim());
          // Optimistic: add/replace own comment
          setLocalComments((prev) => {
            const filtered = prev.filter((c) => !c.isOwn);
            return [
              {
                id: result.id,
                content: result.content,
                createdAt: result.createdAt,
                authorName: "You",
                authorAvatar: null,
                isOwn: true,
              },
              ...filtered,
            ];
          });
          setText("");
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to post comment");
        }
      });
    },
    [campaignId, text, isPending]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startTransition(async () => {
        try {
          await deleteComment(campaignId);
          setLocalComments((prev) => prev.filter((c) => !c.isOwn));
          setText("");
          setIsEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to delete comment");
        }
      });
    },
    [campaignId]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (ownComment) {
        setText(ownComment.content);
        setIsEditing(true);
      }
    },
    [ownComment]
  );

  return (
    <div
      className="pt-[12px] border-t border-[#F1F5F9] mt-[2px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Section header */}
      <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#94A3B8] mb-[10px]">
        Comments{localComments.length > 0 && ` (${localComments.length})`}
      </p>

      {/* Existing comments */}
      {displayComments.length > 0 && (
        <div className="flex flex-col gap-[10px] mb-[10px]">
          {displayComments.map((comment) => (
            <div key={comment.id} className="flex gap-[8px]">
              <Avatar name={comment.authorName} imageUrl={comment.authorAvatar} size={20} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[12px] font-semibold text-[#111111]">{comment.authorName}</span>
                  <span className="text-[11px] text-[#94A3B8]">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-[13px] text-[#64748B] leading-[1.4] line-clamp-2">{comment.content}</p>
              </div>
            </div>
          ))}
          {otherComments.length > 3 && (
            <p className="text-[11px] text-[#94A3B8]">
              +{otherComments.length - 3} more
            </p>
          )}
        </div>
      )}

      {/* Own comment display (if exists and not editing) */}
      {ownComment && !isEditing && (
        <div className="flex gap-[8px] mb-[10px] p-[8px] rounded-lg bg-[#FAF9FA]">
          <Avatar name={ownComment.authorName} imageUrl={ownComment.authorAvatar} size={20} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-[6px]">
              <span className="text-[12px] font-semibold text-[#111111]">You</span>
              <span className="text-[11px] text-[#94A3B8]">{timeAgo(ownComment.createdAt)}</span>
            </div>
            <p className="text-[13px] text-[#64748B] leading-[1.4]">{ownComment.content}</p>
            <div className="flex gap-[8px] mt-[4px]">
              <button
                onClick={handleEdit}
                className="text-[11px] text-[#94A3B8] hover:text-[#64748B] bg-transparent border-none cursor-pointer p-0 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-[11px] text-[#94A3B8] hover:text-[#E5654E] bg-transparent border-none cursor-pointer p-0 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment input (show if no own comment or editing) */}
      {(!ownComment || isEditing) && (
        <form onSubmit={handleSubmit} className="flex gap-[8px]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={localComments.length === 0 ? "Be the first to comment..." : "Share a thought..."}
            rows={1}
            className="flex-1 text-[13px] px-[12px] py-[8px] rounded-lg border border-[#E2E8F0] bg-white text-[#111111] placeholder:text-[#94A3B8] outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] resize-none wall-comment-input transition-all"
          />
          <button
            type="submit"
            disabled={!text.trim() || isPending}
            className="text-[12px] font-semibold px-[12px] py-[8px] rounded-lg bg-[#111111] text-white border-none cursor-pointer hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-default shrink-0 self-end"
          >
            {isPending ? "..." : isEditing ? "Update" : "Post"}
          </button>
        </form>
      )}

      {/* Character counter */}
      {text.length > 400 && (
        <p className="text-[10px] text-[#94A3B8] text-right mt-[2px]">
          {text.length}/500
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-[11px] text-[#E5654E] mt-[4px]">{error}</p>
      )}
    </div>
  );
}
