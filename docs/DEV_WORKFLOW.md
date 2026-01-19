# Development Workflow Guide

## Working Between Two Macs

### The Golden Rule
**GitHub is your single source of truth.** Always pull before starting work, always push when done.

### Daily Workflow

#### Starting Work
```bash
# 1. Navigate to your project
cd ~/path/to/colorwizard

# 2. Check what branch you're on
git status

# 3. Pull latest changes from GitHub
git pull origin main

# 4. Start development server
npm run dev
```

#### Ending Work Session
```bash
# 1. Check what files changed
git status

# 2. Review your changes
git diff

# 3. Add files to staging
git add .

# 4. Commit with descriptive message
git commit -m "Brief description of what you changed"

# 5. Push to GitHub
git push origin main
```

### Common Scenarios

#### Scenario 1: Switching Machines
**On Mac Studio:**
```bash
git add .
git commit -m "Work in progress on Mac Studio"
git push origin main
```

**On MacBook:**
```bash
git pull origin main
# Continue working with all your changes from Mac Studio
```

#### Scenario 2: Forgot to Push
If you made changes on one Mac and forgot to push, then started working on the other Mac:

1. **On the Mac with older code:** Commit what you have with a temp message
2. **Pull from GitHub:** `git pull origin main` (might have merge conflicts)
3. **Resolve conflicts** if any (AI assistants like Claude can help)
4. **Push resolved version:** `git push origin main`

**Better approach:** Always push before switching machines!

#### Scenario 3: Uncommitted Changes When Pulling
If you have uncommitted changes and try to pull:

```bash
# Option 1: Stash your changes temporarily
git stash
git pull origin main
git stash pop  # Brings your changes back

# Option 2: Commit them first
git add .
git commit -m "WIP: describe what you're working on"
git pull origin main
```

### Best Practices

1. **Commit often** - Small, focused commits are better than huge ones
2. **Write good commit messages** - "Fixed bug" is bad, "Fixed color sampling bug with zoom >200%" is good
3. **Pull before you start** - Saves merge headaches later
4. **Push when you're done** - Don't leave work unpushed for days
5. **Use branches for experiments** - Keep main stable

### Using Branches (Optional but Recommended)

For bigger features or experiments:

```bash
# Create and switch to a new branch
git checkout -b feature/new-color-picker

# Work on your feature, commit normally
git add .
git commit -m "Add new color picker component"

# Push the branch to GitHub
git push origin feature/new-color-picker

# When done, merge back to main
git checkout main
git merge feature/new-color-picker
git push origin main

# Delete the feature branch
git branch -d feature/new-color-picker
git push origin --delete feature/new-color-picker
```

### Vercel Deployment

Your Color Wizard is connected to Vercel and deploys automatically from GitHub.

**How it works:**
- Every time you push to the `main` branch, Vercel automatically builds and deploys
- You'll see the deployment status in your Vercel dashboard
- The live site updates in about 2-3 minutes

**Checking deployment:**
1. Visit your Vercel dashboard: https://vercel.com
2. Look for the colorwizard project
3. See recent deployments and their status

**If deployment fails:**
- Check the Vercel logs in your dashboard
- Usually it's a build error - fix it locally first with `npm run build`
- Once it builds successfully locally, push again

### Quick Reference

```bash
# Common commands you'll use daily
git status              # See what changed
git diff                # See exact changes
git add .               # Stage all changes
git add filename        # Stage specific file
git commit -m "message" # Commit with message
git push origin main    # Push to GitHub
git pull origin main    # Pull from GitHub
git log                 # See commit history
npm run dev             # Start development server
npm run build           # Test production build
npm run lint            # Check code quality
```

### Troubleshooting

**Problem:** "Your local changes would be overwritten by merge"
```bash
# Solution: Stash your changes
git stash
git pull
git stash pop
```

**Problem:** Merge conflict after pulling
```bash
# 1. Open the conflicted files (they'll have <<<< and >>>> markers)
# 2. Decide which version to keep
# 3. Remove the conflict markers
# 4. Save the file
git add .
git commit -m "Resolved merge conflict"
git push origin main
```

**Problem:** Accidentally committed something you shouldn't have
```bash
# Undo last commit but keep changes
git reset --soft HEAD~1

# Make your fixes, then commit again
git add .
git commit -m "Corrected commit"
```

### Using AI Assistants (Claude, Antigravity)

Both machines can use AI assistants to help with development. The workflow is:

1. **Pull latest code** from GitHub first
2. **Work with AI assistant** to make changes
3. **Test thoroughly**
4. **Commit and push** when satisfied

**Important:** AI assistants work on local files. If you forget to push, the other machine won't have those changes.

### File Organization

Keep your Color Wizard directory organized:

```
colorwizard/
├── app/              # Next.js app code
├── components/       # React components
├── lib/              # Utilities and logic
├── public/           # Static assets
├── docs/             # Business documents (NEW - create this)
│   ├── ColorWizard_Roadmap.docx
│   └── ...
├── marketing/        # Marketing materials (NEW - create this)
│   ├── screenshots/
│   ├── copy.md
│   └── ...
└── README.md         # Technical documentation
```

Create the new folders:
```bash
cd ~/path/to/colorwizard
mkdir -p docs marketing/screenshots
```

### Next Steps

1. ✅ Set up consistent Git workflow
2. Create docs/ and marketing/ folders
3. Move this workflow guide and roadmap into docs/
4. Commit and push everything
5. Practice the workflow a few times until it feels natural

Remember: When in doubt, commit and push!
