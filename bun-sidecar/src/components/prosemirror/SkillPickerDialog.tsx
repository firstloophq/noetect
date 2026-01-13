"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import { WandIcon } from "lucide-react";
import { skillsAPI } from "@/hooks/useSkillsAPI";
import { Skill } from "@/features/skills";

type SkillPickerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (skill: Skill) => void;
};

export function SkillPickerDialog({ open, onOpenChange, onSelect }: SkillPickerDialogProps) {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    // Reset search when dialog opens/closes
    useEffect(() => {
        if (open) {
            setSearch("");
        }
    }, [open]);

    // Reset scroll position when search changes
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = 0;
        }
    }, [search]);

    useEffect(() => {
        if (!open) return;

        const fetchSkills = async () => {
            setLoading(true);
            try {
                const skillsData = await skillsAPI.getSkills();
                setSkills(skillsData);
            } catch (error) {
                console.error("Failed to fetch skills:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSkills();
    }, [open]);

    const handleSelect = useCallback(
        (skill: Skill) => {
            onSelect(skill);
            onOpenChange(false);
        },
        [onSelect, onOpenChange]
    );

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Insert Skill"
            description="Search for skills to use"
        >
            <CommandInput
                placeholder="Search skills..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList ref={listRef}>
                {loading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                ) : (
                    <>
                        <CommandEmpty>No skills found.</CommandEmpty>

                        {skills.length > 0 && (
                            <CommandGroup heading="Skills">
                                {skills.map((skill) => (
                                    <CommandItem
                                        key={skill.name}
                                        value={`${skill.title} ${skill.name} ${skill.preview}`}
                                        onSelect={() => handleSelect(skill)}
                                    >
                                        <WandIcon className="text-purple-500" />
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            <span className="font-medium">{skill.title}</span>
                                            {skill.preview && (
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {skill.preview}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}
