#!/usr/bin/env bash
# Stop hook — remind to evolve the padangos skill when source files have commits
# newer than the skill's last commit. Uses git history (survives clones, unlike
# mtimes). Silent unless there's a real gap. Never blocks.
root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$root" || exit 0

skill_dir=".claude/skills/padangos"
[ -d "$skill_dir" ] || exit 0

# Last commit that touched the skill, and the last that touched any documented
# source file. If a source commit is newer than the skill commit, the docs may
# be behind.
skill_commit=$(git log -1 --format=%ct -- "$skill_dir" 2>/dev/null)
src_commit=$(git log -1 --format=%ct -- \
  template.html build.js merge.js 'parse*.js' sw.js 2>/dev/null)
[ -z "$src_commit" ] && exit 0
[ -z "$skill_commit" ] && skill_commit=0

if [ "$src_commit" -gt "$skill_commit" ]; then
  # Files from the newest source commit — enough to point where to look.
  changed=$(git show --format= --name-only HEAD -- \
    template.html build.js merge.js parse*.js sw.js 2>/dev/null | sort -u | tr '\n' ' ' | sed 's/ *$//')
  printf '{"systemMessage":"padangos: source (%s) was committed after the skill was last updated. Before ending, consider whether SKILL.md / references need evolving to match."}\n' "$changed"
fi
exit 0
