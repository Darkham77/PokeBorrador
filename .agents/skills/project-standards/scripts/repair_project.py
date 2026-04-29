#!/usr/bin/env python3
import subprocess
import sys
import os

# Configuration: (DisplayName, ScriptPath)
REPAIRS = [
    ("SASS Auto-Repair", ".agents/skills/project-standards/scripts/fix/fix_sass_traps.py"),
    ("Hybrid Pattern Repair", ".agents/skills/project-standards/scripts/fix/fix_hybrid_patterns.py"),
    ("Safari Compatibility", ".agents/skills/project-standards/scripts/fix/fix_webkit_prefixes.py"),
    ("Z-Index Standardization", ".agents/skills/project-standards/scripts/fix/fix_z_indexes.py"),
    ("Empty Style Cleanup", ".agents/skills/project-standards/scripts/fix/fix_empty_styles.py"),
    ("Typography Normalization", ".agents/skills/project-standards/scripts/fix/fix_typography.py"),
    ("GPU & Performance Optimization", ".agents/skills/project-standards/scripts/fix/fix_gpu_gaps.py")
]

def run_repair(name, script):
    print(f"\n[REPAIRING] {name}...")
    try:
        # Run with current python interpreter
        result = subprocess.run([sys.executable, script], capture_output=True, text=True)
        print(result.stdout)
        if result.returncode == 0:
            print(f"[DONE] {name}")
            return True
        else:
            print(f"[FAILED] {name}")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"[ERROR] Could not run {name}: {e}")
        return False

def main():
    print("=" * 60)
    print("POKE VICIO - UNIFIED PROJECT REPAIR ENGINE")
    print("=" * 60)

    results = []
    for name, script in REPAIRS:
        if not os.path.exists(script):
            print(f"[SKIPPED] {name} (Script not found: {script})")
            continue
        
        success = run_repair(name, script)
        results.append((name, success))

    print("\n" + "=" * 60)
    print("FINAL REPAIR SUMMARY")
    print("=" * 60)

    all_passed = True
    for name, success in results:
        status = "OK" if success else "FAIL"
        print(f"{status} | {name}")
        if not success:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("[SUCCESS] All automated repairs completed successfully.")
        sys.exit(0)
    else:
        print("[WARNING] Some repairs failed. Manual intervention required.")
        sys.exit(1)

if __name__ == "__main__":
    main()
