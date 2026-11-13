# Kenz · GCSE Revision

A dark-mode GCSE revision site: every topic for AQA Maths (Higher), Edexcel English Language & Literature, Edexcel Combined Science (Higher), OCR Computer Science (J277), OCR Geography A (J383) and Edexcel Business (1BS0), with videos, Maths Genie sets, a weekly plan, past papers and a built-in PDF editor.

It is a single static page (`index.html`) plus `files/`. No build step.

## Hosting on GitHub Pages
1. Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)`.
2. Open `https://<your-username>.github.io/<repo-name>/`.

GitHub Pages on a free account needs the repo to be **public**. `files/` contains your school's revision PDFs, so keep that in mind before making it public.

## Past papers in the editor
Run `tools/Get GCSE papers.bat` on Windows. It downloads every past paper, mark scheme and Maths Genie sheet into a `gcse-papers` folder. Then on the site go to **Exams & papers → Import papers folder**. The papers are stored in your browser, so they then open straight in the PDF editor.

## Quiz & Learn buttons
These are written live by Claude and only work when the page is opened inside Claude (claude.ai). On a normal host they show a message instead.

## Syncing between devices
Click **☁️ Sync** in the sidebar. On the GitHub-hosted site, paste a GitHub token that has only the `gist` scope; your ticks, quiz scores, paper scores and PDF annotations are stored in a private Gist (`kenz-revision-sync`) and sync on every device you connect with the same token. The copy opened inside Claude syncs automatically through your Claude account. The two copies keep separate progress.
