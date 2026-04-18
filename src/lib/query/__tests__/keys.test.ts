import { describe, it, expect } from 'vitest'
import { tournamentKeys, bookingKeys, profileKeys, adminKeys } from '../keys'

describe('tournamentKeys', () => {
  it('all returns base key', () => {
    expect(tournamentKeys.all()).toEqual(['tournaments'])
  })

  it('open is nested under all', () => {
    expect(tournamentKeys.open()).toEqual(['tournaments', 'open'])
  })

  it('mine includes userId', () => {
    expect(tournamentKeys.mine('uid-1')).toEqual(['tournaments', 'mine', 'uid-1'])
  })

  it('detail includes id', () => {
    expect(tournamentKeys.detail('t-1')).toEqual(['tournaments', 't-1'])
  })
})

describe('bookingKeys', () => {
  it('all returns base key', () => {
    expect(bookingKeys.all()).toEqual(['bookings'])
  })

  it('user includes userId', () => {
    expect(bookingKeys.user('uid-1')).toEqual(['bookings', 'user', 'uid-1'])
  })

  it('invites includes userId', () => {
    expect(bookingKeys.invites('uid-1')).toEqual(['bookings', 'invites', 'uid-1'])
  })
})

describe('profileKeys', () => {
  it('all returns base key', () => {
    expect(profileKeys.all()).toEqual(['profile'])
  })

  it('stats includes userId', () => {
    expect(profileKeys.stats('uid-1')).toEqual(['profile', 'stats', 'uid-1'])
  })

  it('roles includes userId', () => {
    expect(profileKeys.roles('uid-1')).toEqual(['profile', 'roles', 'uid-1'])
  })
})

describe('adminKeys', () => {
  it('all returns base key', () => {
    expect(adminKeys.all()).toEqual(['admin'])
  })

  it('users returns scoped key', () => {
    expect(adminKeys.users()).toEqual(['admin', 'users'])
  })

  it('tournaments returns scoped key', () => {
    expect(adminKeys.tournaments()).toEqual(['admin', 'tournaments'])
  })
})
