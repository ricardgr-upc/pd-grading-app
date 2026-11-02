# Project Disease - browser assessment application

Public interface for an authenticated, private grading workspace. Published with GitHub Pages. This repository contains application code and a rubric only: no student roster, identifying dictionary or assessment files.

## Teachers

Open the published website and enter a **fine-grained personal access token** for the private assessment repository `ricardgr-upc/pd_grading_ibteam`. Select only that repository and grant **Contents: Read and write**. Your GitHub account must already have access to it. Use your own token; do not share it or paste it into chat.

The token is held only in the open tab's memory, is sent only to `https://api.github.com`, and is not written to browser storage. Reconnect after a reload. **Disconnect** closes application access while preserving local unsynchronised work for the same account on the same trusted browser. Browser storage is a local convenience, not encrypted storage or a separate access-control boundary.

Choose Ricard, David or Nuria to filter the assigned coded groups. Use the printed identity key to identify your students. Open a group and **Sync group before grading** to retrieve any work from another computer. Responses autosave in this browser; **Sync group after grading** to save them to the private repository. Network failures retain local work. Sync conflicts retain both versions for explicit resolution. Backups and CSV exports use codes only.

## Privacy and scoring

Student and group codes are random. The coded roster is fetched from the private repository only after authentication. No names, emails, original group identifiers, disease assignments or identifying dictionary are included in this public repository.

Keep the printed identity key offline. Do not put names or disease assignments into notes. Emails and web/repository links are rejected; use page numbers and neutral evidence codes instead. Names cannot be detected automatically. Coded assessments remain confidential and require private repository access.

Each objective has one global result across evidence views. Only Oral scientific communication, Project Execution and Project Documentation have separate group/individual contributions. The rubric weights total 100%; there are no overall stage weights. Pending objectives prevent final grades. Proportional excellence uses `5S + 5SE`, where S and E are the sufficient and excellence attainment proportions with the agreed group/individual weights. Excellence contributes in proportion to sufficient attainment; S = 0.8 and E = 1 gives 8/10. No teacher enters numeric marks.

## Maintainers

This is a static application: no Node.js, GitHub CLI or server is needed on teachers' computers. GitHub Pages hosts only the public interface. GitHub's API enforces access to the private records. Repository-scoped tokens provide authentication; this is not an OAuth sign-in flow.

The deployment workflow uploads only index.html, app.mjs, client.mjs, core.mjs, results.mjs, questions.mjs, policy.json and style.css. Do not add student data, credentials, private roster files or the printed dictionary here. Source changes affect a page into which teachers enter credentials; restrict write access to trusted maintainers.

The private dataset is versioned and fingerprinted. Policy or roster mismatches block imports/sync instead of silently migrating grades. Existing local-server assessments are a separate legacy dataset and are not automatically moved into the coded dataset.

## Results dashboard

After connecting and selecting a teacher, open **Results**, then click **Refresh all groups**. This reads every group's records from GitHub, including other reviewers' groups. It performs no repository writes, preserves unsynchronised local work and retains any conflicts. A partial refresh is labelled incomplete; retry when access or connectivity is restored. A previously saved file disappearing from GitHub does not silently erase its local assessment.

The group-by-domain table shows the mean of students' results within each group. Single values are completed domains; ranges are provisional and include pending objectives. Click a group code to open its assessment. Reviewer and group-completion filters apply to all summaries, tables and Results exports.

Domain averages use only completed student-domain scores, weighted equally per student, with the sample count shown. The overall final-grade mean uses fully assessed students only. Conflicting groups are excluded from completed averages until resolved. Larger groups contribute more students to domain averages; these are student-weighted, not equally weighted group averages.

**Export groups CSV**, **Export domains CSV** and **Export filtered students CSV** download the current filtered results. The original header **Export CSV** still exports all students from this browser's current records. No grading-policy or existing assessment-format migration is needed for the Results dashboard.

## Formula update: 2 November 2026

The current formula is `proportional-excellence-v1`: domain score = `5S + 5SE`. This replaces the previous all-sufficient prerequisite for excellence credit. Criterion and contribution weights remain unchanged. Pending bounds use the same formula with pending responses treated as unmet versus met. Existing checklist answers remain compatible and recalculate after reload; no stored grade records are rewritten. All teachers must reload and reconnect to use the same formula. Re-export old CSV files to obtain updated numeric results; new CSV exports identify their scoring formula.

## Defence questions

Fill an item's **Defence question** field to include it automatically in the shared panel across all assessment tabs. Clearing it removes the card; notes alone do not create a question. Cards show the current **Notes or justification** and **Defence question** directly from the item. There is no copied linked-question editor, marker or resolved state. Met / Not met / Pending remains the explicit grading decision and does not hide the question.

Use **Open linked item** to edit those source fields. **Add question** still creates a standalone editable question addressed to a group or individual code. Answers are retained separately and included in sync and backups. Existing copied question text and legacy flags remain stored for backup compatibility but no longer control linked cards. Original item content and marks are preserved. All teachers should reload the updated interface.
