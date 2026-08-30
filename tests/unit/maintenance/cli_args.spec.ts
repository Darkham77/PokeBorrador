import { describe, it, expect } from 'vitest'
import { parseArgs } from 'node:util'
import { parseServerArguments } from '@/../scripts/database/backup_supabase_db.ts'

describe('CLI Argument Parsing & Standardization', () => {
  const baseProfiles = ['nas_franco', 'cloud']
  const allAvailable = ['nas_franco', 'cloud', 'local-docker', 'official_prod']

  describe('parseServerArguments', () => {
    it('correctly extracts server from --server=<profile>', () => {
      const args = ['--server=nas_franco']
      const result = parseServerArguments(args, baseProfiles, allAvailable)
      expect(result).toEqual(['nas_franco'])
    })

    it('correctly extracts server from -s=<profile>', () => {
      const args = ['-s=cloud']
      const result = parseServerArguments(args, baseProfiles, allAvailable)
      expect(result).toEqual(['cloud'])
    })

    it('correctly extracts server from separated --server <profile>', () => {
      const args = ['--server', 'nas_franco']
      const result = parseServerArguments(args, baseProfiles, allAvailable)
      expect(result).toEqual(['nas_franco'])
    })

    it('correctly returns all profiles when --all is passed', () => {
      const args = ['--all']
      const result = parseServerArguments(args, baseProfiles, allAvailable)
      expect(result).toEqual(baseProfiles)
    })

    it('correctly returns all profiles when positional all is passed', () => {
      const args = ['all']
      const result = parseServerArguments(args, baseProfiles, allAvailable)
      expect(result).toEqual(baseProfiles)
    })
  })

  describe('admin_supabase_users parseArgs schema', () => {
    const parseAdminArgs = (args: string[]) => {
      return parseArgs({
        args,
        options: {
          server: { type: 'string', short: 's' },
          action: { type: 'string', short: 'a' },
          email: { type: 'string', short: 'e' },
          password: { type: 'string', short: 'p' },
          'new-email': { type: 'string' },
          username: { type: 'string', short: 'u' },
          help: { type: 'boolean', short: 'h' }
        },
        allowPositionals: true,
        strict: false
      })
    }

    it('correctly parses all explicit flags for set-password', () => {
      const args = [
        '--server=nas_franco',
        '--action=set-password',
        '--email=usuario@ejemplo.com',
        '--password=poke312'
      ]
      const { values } = parseAdminArgs(args)
      expect(values.server).toBe('nas_franco')
      expect(values.action).toBe('set-password')
      expect(values.email).toBe('usuario@ejemplo.com')
      expect(values.password).toBe('poke312')
    })

    it('correctly parses unban and promote actions with email', () => {
      const unbanArgs = ['--server=cloud', '--action=unban', '--email=banned@ejemplo.com']
      const { values: unbanValues } = parseAdminArgs(unbanArgs)
      expect(unbanValues.server).toBe('cloud')
      expect(unbanValues.action).toBe('unban')
      expect(unbanValues.email).toBe('banned@ejemplo.com')

      const promoteArgs = ['--server=cloud', '--action=promote', '--email=admin@ejemplo.com']
      const { values: promoteValues } = parseAdminArgs(promoteArgs)
      expect(promoteValues.server).toBe('cloud')
      expect(promoteValues.action).toBe('promote')
      expect(promoteValues.email).toBe('admin@ejemplo.com')
    })

    it('correctly parses set-email with new-email flag', () => {
      const args = [
        '--server=nas_franco',
        '--action=set-email',
        '--email=old@test.com',
        '--new-email=new@test.com'
      ]
      const { values } = parseAdminArgs(args)
      expect(values.server).toBe('nas_franco')
      expect(values.action).toBe('set-email')
      expect(values.email).toBe('old@test.com')
      expect(values['new-email']).toBe('new@test.com')
    })
  })
})
