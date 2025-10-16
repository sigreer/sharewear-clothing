#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import re
import shutil
from pathlib import Path
from datetime import datetime
from utils.constants import ensure_session_log_dir

def extract_rm_targets(command):
    """
    Extract file/directory paths from rm commands.
    Returns list of paths that will be deleted.
    """
    import shlex

    try:
        parts = shlex.split(command)
    except:
        # If shlex fails, use simple split
        parts = command.split()

    # Find rm command and extract targets (non-flag arguments after rm)
    targets = []
    found_rm = False

    for part in parts:
        if 'rm' in part.lower():
            found_rm = True
            continue

        if found_rm and not part.startswith('-'):
            targets.append(part)

    return targets

def backup_files_before_rm(targets, backup_base_dir='/home/simon/Dev/sigreer/sharewear.clothing/deleted-temp'):
    """
    Create backups of files/directories before they are deleted.
    Returns True if backups were created successfully, False otherwise.
    """
    if not targets:
        return True

    try:
        # Create timestamped backup directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = Path(backup_base_dir) / timestamp
        backup_dir.mkdir(parents=True, exist_ok=True)

        backed_up = []

        for target in targets:
            target_path = Path(target).resolve()

            # Skip if target doesn't exist
            if not target_path.exists():
                continue

            # Create backup with original structure
            backup_target = backup_dir / target_path.name

            # Handle potential name collisions
            counter = 1
            original_backup = backup_target
            while backup_target.exists():
                backup_target = backup_dir / f"{original_backup.stem}_{counter}{original_backup.suffix}"
                counter += 1

            # Copy file or directory
            if target_path.is_file():
                shutil.copy2(target_path, backup_target)
                backed_up.append(str(target_path))
            elif target_path.is_dir():
                shutil.copytree(target_path, backup_target)
                backed_up.append(str(target_path))

        if backed_up:
            print(f"✓ Backed up to {backup_dir}:", file=sys.stderr)
            for item in backed_up:
                print(f"  - {item}", file=sys.stderr)

        return True

    except Exception as e:
        print(f"⚠ Backup failed: {e}", file=sys.stderr)
        print("Blocking rm command due to backup failure", file=sys.stderr)
        return False

def is_dangerous_rm_command(command):
    """
    Detect rm commands and check if they target critical system paths.
    Returns True only for truly dangerous system paths.
    """
    # Normalize command by removing extra spaces and converting to lowercase
    normalized = ' '.join(command.lower().split())

    # Only block rm commands targeting critical system paths
    critical_paths = [
        r'\s+/$',           # Root directory exactly
        r'\s+/\s+',         # Root with space after
        r'\s+/\*\s*$',      # Root with wildcard
        r'\s+/bin',         # System binaries
        r'\s+/boot',        # Boot files
        r'\s+/dev',         # Device files
        r'\s+/etc',         # System configuration
        r'\s+/lib',         # System libraries
        r'\s+/proc',        # Process info
        r'\s+/root',        # Root home
        r'\s+/sbin',        # System binaries
        r'\s+/sys',         # System files
        r'\s+/usr',         # User programs
        r'\s+/var',         # Variable data
    ]

    # Check if rm command exists
    if not re.search(r'\brm\s+', normalized):
        return False

    # Check for critical system paths
    for path in critical_paths:
        if re.search(path, normalized):
            return True

    return False

def is_env_file_access(tool_name, tool_input):
    """
    Check if any tool is trying to access .env files containing sensitive data.
    """
    if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write', 'Bash']:
        # Check file paths for file-based tools
        if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write']:
            file_path = tool_input.get('file_path', '')
            if '.env' in file_path and not file_path.endswith('.env.sample'):
                return True
        
        # Check bash commands for .env file access
        elif tool_name == 'Bash':
            command = tool_input.get('command', '')
            # Pattern to detect .env file access (but allow .env.sample)
            env_patterns = [
                r'\b\.env\b(?!\.sample)',  # .env but not .env.sample
                r'cat\s+.*\.env\b(?!\.sample)',  # cat .env
                r'echo\s+.*>\s*\.env\b(?!\.sample)',  # echo > .env
                r'touch\s+.*\.env\b(?!\.sample)',  # touch .env
                r'cp\s+.*\.env\b(?!\.sample)',  # cp .env
                r'mv\s+.*\.env\b(?!\.sample)',  # mv .env
            ]
            
            for pattern in env_patterns:
                if re.search(pattern, command):
                    return True
    
    return False

def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        
        tool_name = input_data.get('tool_name', '')
        tool_input = input_data.get('tool_input', {})
        
        # Check for .env file access (blocks access to sensitive environment files)
        # COMMENTED OUT: Allowing .env file access for development
        # if is_env_file_access(tool_name, tool_input):
        #     print("BLOCKED: Access to .env files containing sensitive data is prohibited", file=sys.stderr)
        #     print("Use .env.sample for template files instead", file=sys.stderr)
        #     sys.exit(2)  # Exit code 2 blocks tool call and shows error to Claude
        
        # Handle rm commands: backup files before deletion
        if tool_name == 'Bash':
            command = tool_input.get('command', '')

            # Block only truly dangerous system path deletions
            if is_dangerous_rm_command(command):
                print("BLOCKED: Dangerous system path deletion detected and prevented", file=sys.stderr)
                sys.exit(2)  # Exit code 2 blocks tool call and shows error to Claude

            # For other rm commands, create backups before proceeding
            if re.search(r'\brm\s+', command):
                targets = extract_rm_targets(command)
                if targets:
                    # Create backups; only proceed if backup succeeds
                    if not backup_files_before_rm(targets):
                        sys.exit(2)  # Block if backup fails
        
        # Extract session_id
        session_id = input_data.get('session_id', 'unknown')
        
        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_path = log_dir / 'pre_tool_use.json'
        
        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []
        
        # Append new data
        log_data.append(input_data)
        
        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        sys.exit(0)
        
    except json.JSONDecodeError:
        # Gracefully handle JSON decode errors
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)

if __name__ == '__main__':
    main()