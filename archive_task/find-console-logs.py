#!/usr/bin/env python3
"""
Console Log Finder Script
Finds all console.log, console.error, console.warn, console.debug statements in the codebase
without modifying them.
"""

import os
import re
import sys
from pathlib import Path

# File extensions to search
EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']

# Console methods to search for
CONSOLE_METHODS = ['log', 'error', 'warn', 'debug', 'info', 'trace', 'assert', 'dir', 'table']

# Directories to exclude
EXCLUDE_DIRS = {
    'node_modules', '.git', '.next', 'out', 'dist', 'build', 
    '.cache', 'coverage', '.nuxt', '.vscode', '.idea'
}

def should_skip_directory(dir_path):
    """Check if directory should be skipped"""
    dir_name = os.path.basename(dir_path)
    return dir_name in EXCLUDE_DIRS or dir_name.startswith('.')

def find_console_statements(file_path):
    """Find all console statements in a file"""
    console_statements = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            line_stripped = line.strip()
            
            # Skip empty lines and pure comments
            if not line_stripped or line_stripped.startswith('//'):
                continue
                
            # Look for console statements
            for method in CONSOLE_METHODS:
                pattern = rf'console\.{method}\s*\('
                matches = re.finditer(pattern, line, re.IGNORECASE)
                
                for match in matches:
                    # Check if it's commented out
                    before_match = line[:match.start()].strip()
                    is_commented = before_match.startswith('//') or before_match.startswith('*') or '/*' in before_match
                    
                    console_statements.append({
                        'line_number': line_num,
                        'method': method,
                        'content': line.strip(),
                        'is_commented': is_commented,
                        'column': match.start() + 1
                    })
                    
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        
    return console_statements

def scan_directory(root_path):
    """Scan directory for console statements"""
    results = {}
    total_files = 0
    total_console_statements = 0
    
    print(f"🔍 Scanning directory: {root_path}")
    print("=" * 80)
    
    for root, dirs, files in os.walk(root_path):
        # Remove excluded directories from dirs list to skip them
        dirs[:] = [d for d in dirs if not should_skip_directory(os.path.join(root, d))]
        
        for file in files:
            if not any(file.endswith(ext) for ext in EXTENSIONS):
                continue
                
            file_path = os.path.join(root, file)
            total_files += 1
            
            console_statements = find_console_statements(file_path)
            
            if console_statements:
                # Make path relative to root for cleaner output
                rel_path = os.path.relpath(file_path, root_path)
                results[rel_path] = console_statements
                total_console_statements += len(console_statements)
    
    return results, total_files, total_console_statements

def print_results(results, total_files, total_console_statements):
    """Print the results in a formatted way"""
    
    if not results:
        print("✅ No console statements found!")
        return
    
    print(f"\n📊 SUMMARY")
    print("=" * 80)
    print(f"Files scanned: {total_files}")
    print(f"Files with console statements: {len(results)}")
    print(f"Total console statements: {total_console_statements}")
    
    # Group by console method
    method_counts = {}
    commented_counts = {}
    
    for file_path, statements in results.items():
        for stmt in statements:
            method = stmt['method']
            method_counts[method] = method_counts.get(method, 0) + 1
            
            if stmt['is_commented']:
                commented_counts[method] = commented_counts.get(method, 0) + 1
    
    print(f"\n📈 CONSOLE METHOD BREAKDOWN")
    print("-" * 40)
    for method in sorted(method_counts.keys()):
        total = method_counts[method]
        commented = commented_counts.get(method, 0)
        active = total - commented
        print(f"console.{method:<8}: {total:>3} total ({active:>3} active, {commented:>3} commented)")
    
    print(f"\n📂 FILES WITH CONSOLE STATEMENTS")
    print("=" * 80)
    
    for file_path, statements in sorted(results.items()):
        active_count = sum(1 for s in statements if not s['is_commented'])
        commented_count = sum(1 for s in statements if s['is_commented'])
        
        print(f"\n📄 {file_path}")
        print(f"   {len(statements)} total ({active_count} active, {commented_count} commented)")
        print("-" * 40)
        
        for stmt in statements:
            status = "💬" if stmt['is_commented'] else "🟢"
            method_display = f"console.{stmt['method']}"
            line_info = f"Line {stmt['line_number']}:{stmt['column']}"
            
            print(f"  {status} {method_display:<15} {line_info:<12} {stmt['content']}")

def main():
    """Main function"""
    # Get the directory to scan
    if len(sys.argv) > 1:
        scan_path = sys.argv[1]
    else:
        scan_path = os.getcwd()
    
    if not os.path.exists(scan_path):
        print(f"❌ Path does not exist: {scan_path}")
        sys.exit(1)
    
    if not os.path.isdir(scan_path):
        print(f"❌ Path is not a directory: {scan_path}")
        sys.exit(1)
    
    print("🔍 Console Statement Finder")
    print("=" * 80)
    print(f"Target directory: {os.path.abspath(scan_path)}")
    print(f"File extensions: {', '.join(EXTENSIONS)}")
    print(f"Console methods: {', '.join(CONSOLE_METHODS)}")
    print(f"Excluded dirs: {', '.join(sorted(EXCLUDE_DIRS))}")
    
    # Scan for console statements
    results, total_files, total_console_statements = scan_directory(scan_path)
    
    # Print results
    print_results(results, total_files, total_console_statements)
    
    # Save results to file
    output_file = "console-statements-report.txt"
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            # Redirect stdout to file temporarily
            import io
            old_stdout = sys.stdout
            sys.stdout = f
            
            print("🔍 Console Statement Finder - Full Report")
            print("=" * 80)
            print(f"Generated on: {os.popen('date').read().strip()}")
            print(f"Target directory: {os.path.abspath(scan_path)}")
            print_results(results, total_files, total_console_statements)
            
            # Restore stdout
            sys.stdout = old_stdout
            
        print(f"\n💾 Report saved to: {output_file}")
        
    except Exception as e:
        print(f"⚠️ Could not save report: {e}")

if __name__ == "__main__":
    main()