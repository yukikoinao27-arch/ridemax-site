"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Department, JobOpening } from "@/lib/ridemax-types";

type CareersJobBrowserProps = {
  departments: ReadonlyArray<Department>;
  jobs: ReadonlyArray<JobOpening>;
  initialDepartment?: string;
};

function readDepartment(value: string | null) {
  return (value ?? "").trim();
}

export function CareersJobBrowser({ departments, jobs, initialDepartment = "" }: CareersJobBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedDepartment = readDepartment(searchParams.get("department")) || initialDepartment;

  const filteredJobs = useMemo(() => {
    if (!selectedDepartment) {
      return jobs;
    }

    return jobs.filter((job) => job.departmentSlug === selectedDepartment);
  }, [jobs, selectedDepartment]);

  return (
    <div>
      <div className="mt-10 flex max-w-[34rem] flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-[#6a433d]">Department</label>
          <select
            value={selectedDepartment}
            onChange={(event) => {
              const next = event.target.value;
              const params = new URLSearchParams(searchParams.toString());

              if (next) {
                params.set("department", next);
              } else {
                params.delete("department");
              }

              const query = params.toString();
              router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
            }}
            className="mt-2 w-full border border-black/10 px-3 py-3 text-[#220707] outline-none focus:border-[#8d120e]"
          >
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.slug}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-10 space-y-5">
        {filteredJobs.map((job) => (
          <article
            key={job.id}
            className="card-lift flex flex-col gap-4 border border-black/10 bg-white px-6 py-7 shadow-[0_10px_20px_rgba(28,20,19,0.05)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 className="text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                {job.title}
              </h3>
              <p className="mt-3 text-[#8d120e]">{job.location}</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#4d3b37]">{job.summary}</p>
            </div>
            <Link
              href={`/careers/${job.slug}`}
              className="card-lift-reveal inline-flex h-11 items-center justify-center border border-black/15 px-6 text-sm font-semibold text-[#220707] transition hover:bg-[#f5efee]"
            >
              View Job
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

