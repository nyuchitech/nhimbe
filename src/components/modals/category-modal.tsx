"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BottomSheetModal } from "./bottom-sheet-modal";
import type { Category } from "@/lib/api";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  category: string;
  setCategory: (value: string) => void;
  tags: string[];
  tagInput: string;
  setTagInput: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  categories,
  category,
  setCategory,
  tags,
  tagInput,
  setTagInput,
  addTag,
  removeTag,
}: CategoryModalProps) {
  return (
    <BottomSheetModal isOpen={isOpen} onClose={onClose} title="Category & Tags">
      <div className="space-y-4">
        <div>
          <Label className="block text-sm text-text-secondary mb-2">Category</Label>
          {/* Group categories by their group field */}
          {Object.entries(
            categories.reduce((groups, cat) => {
              const group = cat.group;
              if (!groups[group]) groups[group] = [];
              groups[group].push(cat);
              return groups;
            }, {} as Record<string, Category[]>)
          ).map(([groupName, groupCategories]) => (
            <div key={groupName} className="mb-4">
              <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">{groupName}</div>
              <div className="grid grid-cols-2 gap-2">
                {groupCategories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    onClick={() => setCategory(cat.id)}
                    className={`px-4 py-3 rounded-xl text-left justify-start ${
                      category === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface hover:bg-elevated"
                    }`}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <Label className="block text-sm text-text-secondary mb-2">Tags</Label>
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add a tag..."
              className="flex-1 px-4 py-3 bg-surface rounded-xl border-none outline-none"
            />
            <Button onClick={addTag} className="px-4 py-3 bg-primary text-primary-foreground rounded-xl">
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-surface rounded-full text-sm">
                  #{tag}
                  <Button variant="ghost" size="sm" onClick={() => removeTag(tag)} className="hover:text-red-400 p-0 h-auto min-h-0">
                    <X className="w-4 h-4" />
                  </Button>
                </span>
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={onClose}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
        >
          Done
        </Button>
      </div>
    </BottomSheetModal>
  );
}
