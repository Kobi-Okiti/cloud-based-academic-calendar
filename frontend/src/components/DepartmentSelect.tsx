"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { DEPARTMENT_GROUPS } from "@/lib/departments";

type SearchResult = {
  faculty: string;
  section: string;
  department: string;
};

type DepartmentSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export default function DepartmentSelect({
  value,
  onChange,
  placeholder = "Select department"
}: DepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  const filteredResults = useMemo(() => {
    const cleaned = normalize(query);
    if (!cleaned) return [];

    return DEPARTMENT_GROUPS.flatMap((group) =>
      group.sections.flatMap((section) =>
        section.departments
          .filter((department) => {
            const departmentMatch = normalize(department).includes(cleaned);
            const facultyMatch = normalize(group.faculty).includes(cleaned);
            const sectionMatch = normalize(section.name).includes(cleaned);
            return departmentMatch || facultyMatch || sectionMatch;
          })
          .map((department) => ({
            faculty: group.faculty,
            section: section.name,
            department
          }))
      )
    );
  }, [query]);

  const renderGroupedList = () => (
    <div className="space-y-4">
      {DEPARTMENT_GROUPS.map((group) => (
        <div key={group.faculty} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
            {group.faculty}
          </p>
          {group.sections.map((section) => (
            <div key={`${group.faculty}-${section.name}`} className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">{section.name}</p>
              <div className="space-y-1">
                {section.departments.map((department) => (
                  <button
                    key={`${group.faculty}-${section.name}-${department}`}
                    type="button"
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50",
                      value === department
                        ? "bg-blue-100 text-blue-950"
                        : "text-slate-700"
                    )}
                    onClick={() => {
                      onChange(department);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {department}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderSearchResults = () => {
    if (filteredResults.length === 0) {
      return (
        <p className="px-1 py-2 text-sm text-slate-500">
          No departments found for &quot;{query}&quot;.
        </p>
      );
    }

    return (
      <div className="space-y-1">
        {filteredResults.map((result) => (
          <button
            key={`${result.faculty}-${result.section}-${result.department}`}
            type="button"
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50",
              value === result.department
                ? "bg-blue-100 text-blue-950"
                : "text-slate-700"
            )}
            onClick={() => {
              onChange(result.department);
              setQuery("");
              setOpen(false);
            }}
          >
            <p className="text-sm font-medium">{result.department}</p>
            <p className="text-xs text-slate-500">
              {result.faculty} • {result.section}
            </p>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="input flex items-center justify-between gap-3 text-left"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className={value ? "text-slate-900" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <input
            ref={searchRef}
            className="input"
            placeholder="Search department or faculty..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="mt-3 max-h-[min(24rem,60vh)] overflow-y-auto pr-1">
            {query.trim() ? renderSearchResults() : renderGroupedList()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
