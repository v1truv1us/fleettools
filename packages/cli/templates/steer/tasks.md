# Fleet Steer Task Breakdown Prompt — {{slug}}

Create `specs/{{slug}}/05-tasks.md` as a markdown checklist of atomic tasks.

Each task must be independently committable and may include dependencies using `(deps: 001-example, 002-other)`.

Example:
- [ ] Add state reader and atomic writer
- [ ] Wire CLI command registration (deps: 001-add-state-reader-and-atomic-writer)

Include only the task checklist and short notes needed for execution.
