#!/usr/bin/env python3
import subprocess
import sys
import os

# Configuration: (DisplayName, ScriptPath)
AUDITS = [
    ("SASS Technical Traps", ".agents/skills/project-standards/scripts/audit/check_sass_traps.py"),
    ("Pure Vue & Aesthetics", ".agents/skills/project-standards/scripts/audit/detect_hybrid_patterns.py"),
    ("GPU Performance Gaps", ".agents/skills/project-standards/scripts/audit/detect_gpu_gaps.py"),
    ("File Length Limits", ".agents/skills/project-standards/scripts/audit/check_file_length.py"),
    ("CSS Redundancy", ".agents/skills/project-standards/scripts/audit/detect_css_redundancy.py")
]

def run_audit(name, script):
    print(f"\n[RUNNING] {name}...")
    try:
        # Run with current python interpreter
        result = subprocess.run([sys.executable, script], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"[PASSED] {name}")
            return True, result.stdout
        else:
            print(f"[FAILED] {name}")
            return False, result.stdout + result.stderr
    except Exception as e:
        print(f"[ERROR] Could not run {name}: {e}")
        return False, str(e)

def main():
    print("=" * 60)
    print("POKE VICIO - UNIFIED PROJECT AUDIT ENGINE")
    print("=" * 60)

    results = []
    for name, script in AUDITS:
        if not os.path.exists(script):
            print(f"[SKIPPED] {name} (Script not found: {script})")
            continue
        
        success, output = run_audit(name, script)
        results.append((name, success, output))

    print("\n" + "=" * 60)
    print("FINAL AUDIT SUMMARY")
    print("=" * 60)

    all_passed = True
    for name, success, output in results:
        status = "PASS" if success else "FAIL"
        print(f"{status} | {name}")
        if not success:
            all_passed = False
            # Print a snippet of the failure
            lines = output.splitlines()
            for line in lines[-10:]: # Last 10 lines
                if line.strip():
                    print(f"    {line}")

    print("=" * 60)
    if all_passed:
        print("[SUCCESS] EXCELLENT! Project standards are at 100%.")
        sys.exit(0)
    else:
        print("[FAILURE] REJECTED! Project standards violations found. Refactor before commit.")
        sys.exit(1)

if __name__ == "__main__":
    main()
