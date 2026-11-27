# Capstone Quest

Students propose a capstone project, a mentor approves the idea and its marking criteria, the student submits a GitHub repository, gist or zip with an optional live link, an AI drafts a review, and the mentor approves the grade. Students see their progress as a journey across five islands, earn badges, dress their builder and visit the cohort world.

## Set it up

### 1. Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`, `0002_cohort_life.sql` and `0003_removal_and_privacy.sql` from the same folder, in that order.
3. Edit the organisation, cohort and track names in `supabase/seed.sql`, then run it **once**. Keep the two codes it returns: `student_code` and `mentor_code`.
4. Note the Project URL, the publishable key and a secret key from the API Keys settings.

### 2. GitHub sign-in

1. In GitHub, open Settings, Developer settings, OAuth Apps and create a new app.
2. Set the authorization callback URL to `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
3. In Supabase, enable the GitHub provider under Authentication and paste in the client ID and secret.

### 3. Vercel

1. Push this folder to a GitHub repository and import it in Vercel.
2. Add the variables listed in `.env.example`. Keep keys out of chat, screenshots and the repository.
3. Deploy, and keep Fluid compute on (the default) so reviews can run for up to five minutes.
4. Back in Supabase, under Authentication, URL Configuration, set the Site URL to your Vercel address and add `https://YOUR-APP.vercel.app/**` to the redirect URLs.

For `GITHUB_TOKEN`, create a fine-grained token that can read public repositories only.

Vercel limits its free Hobby plan to non-commercial, personal use, so check which plan your organisation needs.

### 4. First run

1. Open `https://YOUR-APP.vercel.app/join/MENTOR_CODE` and sign in. You are now the mentor.
2. Set the deadline, attempts and track expectations at the bottom of Mission control.
3. Optionally paste your students' emails under People so they join without waiting. Anyone else appears there for you to let in or decline.
4. Do one full practice run with a second GitHub account using the student link before inviting students. Include a zip upload.

To add another cohort or organisation, run the cohort part of `supabase/seed.sql` again with new names.

Mentors can also remove a student under People. The student loses access and comes off the email list, their work is kept, and it returns if a mentor lets them back in. In a private cohort, students see only their own plot in the cohort world.

## Run it locally

```bash
cp .env.example .env.local   # then fill it in
npm install
npm run dev
```

Add `http://localhost:3000/**` to the Supabase redirect URLs for local sign-in.

## Checks

```bash
npm test          # review engine and journey rules (Node 22.18 or newer)
npm run test:db   # database access rules, needs a local Postgres installation
npm run lint
npm run build
```

## How reviews work

- Only public repositories, public or secret gists by link, and uploaded zips up to 20 MB are read.
- The commit or gist version is frozen the first time it is read, normally seconds after submission. If that happens more than ten minutes later, the mentor is warned. A live site cannot be frozen.
- Up to 60 text files are read. Dependencies, build output, lock files and secret files are left out.
- A cheaper model reads the files and takes notes, and a stronger model drafts the scores.
- The live link gets one plain web request. The page's scripts do not run and nothing is clicked.
- Code is never executed or compiled.
- Students see nothing from the AI. They see only what a mentor approves.
