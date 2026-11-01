# Project Disease - browser assessment application

Public interface for an authenticated, private grading workspace. Published with GitHub Pages. This repository contains application code and a rubric only: no student roster, identifying dictionary or assessment files.

## Teachers

Open the published website and enter a **fine-grained personal access token** for the private assessment repository `ricardgr-upc/pd_grading_ibteam`. Select only that repository and grant **Contents: Read and write**. Your GitHub account must already have access to it. Use your own token; do not share it or paste it into chat.

The token is held only in the open tab's memory, is sent only to `https://api.github.com`, and is not written to browser storage. Reconnect after a reload. **Disconnect** closes application access while preserving local unsynchronised work for the same account on the same trusted browser. Browser storage is a local convenience, not encrypted storage or a separate access-control boundary.

Choose Ricard, David or Nuria to filter the assigned coded groups. Use the printed identity key to identify your students. Open a group and **Sync group before grading** to retrieve any work from another computer. Responses autosave in this browser; **Sync group after grading** to save them to the private repository. Network failures retain local work. Sync conflicts retain both versions for explicit resolution. Backups and CSV exports use codes only.

## Privacy and scoring

Student and group codes are random. The coded roster is fetched from the private repository only after authentication. No names, emails, original group identifiers, disease assignments or identifying dictionary are included in this public repository.

Keep the printed identity key offline. Do not put names or disease assignments into notes. Emails and web/repository links are rejected; use page numbers and neutral evidence codes instead. Names cannot be detected automatically. Coded assessments remain confidential and require private repository access.

Each objective has one global result across evidence views. Only Oral scientific communication, Project Execution and Project Documentation have separate group/individual contributions. The rubric weights total 100%; there are no overall stage weights. Pending objectives prevent final grades. Excellence contributes after all sufficient objectives for that student's criterion are met. No teacher enters numeric marks.

## Maintainers

This is a static application: no Node.js, GitHub CLI or server is needed on teachers' computers. GitHub Pages hosts only the public interface. GitHub's API enforces access to the private records. Repository-scoped tokens provide authentication; this is not an OAuth sign-in flow.

The deployment workflow uploads only index.html, app.mjs, client.mjs, core.mjs, policy.json and style.css. Do not add student data, credentials, private roster files or the printed dictionary here. Source changes affect a page into which teachers enter credentials; restrict write access to trusted maintainers.

The private dataset is versioned and fingerprinted. Policy or roster mismatches block imports/sync instead of silently migrating grades. Existing local-server assessments are a separate legacy dataset and are not automatically moved into the coded dataset.
