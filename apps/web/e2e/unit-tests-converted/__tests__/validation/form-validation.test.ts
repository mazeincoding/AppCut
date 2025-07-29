import { describe, it, expect } from '@jest/globals'

// Extract the validation logic for testing
function isValidFilename(name: string): boolean {
  return name.trim().length > 0 && !/[<>:"/\\|?*]/.test(name)
}

describe('Form Validation', () => {
  describe('Filename validation', () => {
    it('should accept valid filename', () => {
      expect(isValidFilename('my-video')).toBe(true)
      expect(isValidFilename('Video_2024')).toBe(true)
      expect(isValidFilename('project-final')).toBe(true)
      expect(isValidFilename('export123')).toBe(true)
    })

    it('should accept filenames with spaces', () => {
      expect(isValidFilename('my video file')).toBe(true)
      expect(isValidFilename('Project Final Cut')).toBe(true)
    })

    it('should accept filenames with dots and dashes', () => {
      expect(isValidFilename('video.backup')).toBe(true)
      expect(isValidFilename('my-project-v2')).toBe(true)
      expect(isValidFilename('file_name.old')).toBe(true)
    })

    it('should accept filenames with numbers', () => {
      expect(isValidFilename('video1')).toBe(true)
      expect(isValidFilename('2024-project')).toBe(true)
      expect(isValidFilename('file123abc')).toBe(true)
    })

    it('should accept unicode characters', () => {
      expect(isValidFilename('видео')).toBe(true)
      expect(isValidFilename('プロジェクト')).toBe(true)
      expect(isValidFilename('proyecto')).toBe(true)
    })
  })

  describe('Invalid characters handling', () => {
    it('should reject filename with < character', () => {
      expect(isValidFilename('file<name')).toBe(false)
      expect(isValidFilename('<filename')).toBe(false)
      expect(isValidFilename('filename<')).toBe(false)
    })

    it('should reject filename with > character', () => {
      expect(isValidFilename('file>name')).toBe(false)
      expect(isValidFilename('>filename')).toBe(false)
      expect(isValidFilename('filename>')).toBe(false)
    })

    it('should reject filename with : character', () => {
      expect(isValidFilename('file:name')).toBe(false)
      expect(isValidFilename(':filename')).toBe(false)
      expect(isValidFilename('filename:')).toBe(false)
    })

    it('should reject filename with " character', () => {
      expect(isValidFilename('file"name')).toBe(false)
      expect(isValidFilename('"filename')).toBe(false)
      expect(isValidFilename('filename"')).toBe(false)
    })

    it('should reject filename with / character', () => {
      expect(isValidFilename('file/name')).toBe(false)
      expect(isValidFilename('/filename')).toBe(false)
      expect(isValidFilename('filename/')).toBe(false)
    })

    it('should reject filename with \\ character', () => {
      expect(isValidFilename('file\\name')).toBe(false)
      expect(isValidFilename('\\filename')).toBe(false)
      expect(isValidFilename('filename\\')).toBe(false)
    })

    it('should reject filename with | character', () => {
      expect(isValidFilename('file|name')).toBe(false)
      expect(isValidFilename('|filename')).toBe(false)
      expect(isValidFilename('filename|')).toBe(false)
    })

    it('should reject filename with ? character', () => {
      expect(isValidFilename('file?name')).toBe(false)
      expect(isValidFilename('?filename')).toBe(false)
      expect(isValidFilename('filename?')).toBe(false)
    })

    it('should reject filename with * character', () => {
      expect(isValidFilename('file*name')).toBe(false)
      expect(isValidFilename('*filename')).toBe(false)
      expect(isValidFilename('filename*')).toBe(false)
    })

    it('should reject filename with multiple invalid characters', () => {
      expect(isValidFilename('file<>name')).toBe(false)
      expect(isValidFilename('bad:file/name')).toBe(false)
      expect(isValidFilename('file"with*many|bad?chars')).toBe(false)
    })
  })

  describe('Empty filename prevention', () => {
    it('should reject empty filename', () => {
      expect(isValidFilename('')).toBe(false)
    })

    it('should reject filename with only spaces', () => {
      expect(isValidFilename(' ')).toBe(false)
      expect(isValidFilename('   ')).toBe(false)
      expect(isValidFilename('\t')).toBe(false)
      expect(isValidFilename('\n')).toBe(false)
    })

    it('should reject filename with only whitespace', () => {
      expect(isValidFilename(' \t \n ')).toBe(false)
    })

    it('should accept filename with spaces around valid content', () => {
      expect(isValidFilename(' filename ')).toBe(true)
      expect(isValidFilename('\tmy-video\t')).toBe(true)
    })
  })

  describe('Edge cases', () => {
    it('should handle very long filenames', () => {
      const longFilename = 'a'.repeat(255)
      expect(isValidFilename(longFilename)).toBe(true)
      
      const veryLongFilename = 'a'.repeat(1000)
      expect(isValidFilename(veryLongFilename)).toBe(true)
    })

    it('should handle single character filenames', () => {
      expect(isValidFilename('a')).toBe(true)
      expect(isValidFilename('1')).toBe(true)
      expect(isValidFilename('-')).toBe(true)
    })

    it('should handle filenames starting with dots', () => {
      expect(isValidFilename('.hidden')).toBe(true)
      expect(isValidFilename('..config')).toBe(true)
    })

    it('should handle mixed case filenames', () => {
      expect(isValidFilename('MyVideoFile')).toBe(true)
      expect(isValidFilename('SHOUTING_FILENAME')).toBe(true)
      expect(isValidFilename('CamelCaseFileName')).toBe(true)
    })

    it('should trim whitespace for validation', () => {
      // These should be valid because trimming removes leading/trailing spaces
      expect(isValidFilename(' valid-filename ')).toBe(true)
      expect(isValidFilename('\tmy-video\t')).toBe(true)
      
      // But empty after trim should be invalid
      expect(isValidFilename('   ')).toBe(false)
    })
  })

  describe('Real-world filename examples', () => {
    it('should accept common video filenames', () => {
      expect(isValidFilename('vacation-2024')).toBe(true)
      expect(isValidFilename('birthday_party')).toBe(true)
      expect(isValidFilename('presentation-final')).toBe(true)
      expect(isValidFilename('demo_video_v2')).toBe(true)
    })

    it('should accept project-style filenames', () => {
      expect(isValidFilename('project-export-1080p')).toBe(true)
      expect(isValidFilename('client_review_draft')).toBe(true)
      expect(isValidFilename('final-cut-approved')).toBe(true)
    })

    it('should reject problematic filenames', () => {
      expect(isValidFilename('CON')).toBe(true) // This is actually valid in our simple validation
      expect(isValidFilename('file with ? marks')).toBe(false)
      expect(isValidFilename('path/to/file')).toBe(false)
      expect(isValidFilename('file"with"quotes')).toBe(false)
    })
  })

  describe('Security considerations', () => {
    it('should reject filenames that could be path traversal attempts', () => {
      expect(isValidFilename('../../../etc/passwd')).toBe(false)
      expect(isValidFilename('..\\..\\windows\\system32')).toBe(false)
      expect(isValidFilename('file/../other')).toBe(false)
    })

    it('should reject filenames with command injection patterns', () => {
      expect(isValidFilename('file; rm -rf /')).toBe(false)
      expect(isValidFilename('file | cat /etc/passwd')).toBe(false)
      expect(isValidFilename('file > /dev/null')).toBe(false)
    })

    it('should reject filenames with HTML/XML patterns', () => {
      expect(isValidFilename('file<script>alert(1)</script>')).toBe(false)
      expect(isValidFilename('<img src=x onerror=alert(1)>')).toBe(false)
    })
  })
})