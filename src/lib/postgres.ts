// PostgreSQL Full-Stack Client for MangaHub
// Directly executes structured SQL queries and CRUD operations on the Express / PostgreSQL backend via /api/db/query

export type FilterMap = Record<string, any>

export interface QueryOptions {
  orderBy?: string
  desc?: boolean
  limit?: number
  head?: boolean
}

// In-Memory Session State for PostgreSQL & MangaHub (HttpOnly Cookie-driven, No localStorage token)
let inMemorySession: any = null
const listeners = new Set<(event: string, session: any) => void>()

// Proactively clear legacy token from localStorage to eliminate dual exposure
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('mangahub_auth_session')
  } catch {}
}

export function getStoredSession() {
  return inMemorySession
}

export function getAuthHeader(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  }
}

function setStoredSession(session: any) {
  inMemorySession = session
  listeners.forEach(fn => fn(session ? 'SIGNED_IN' : 'SIGNED_OUT', session))
}

export class PostgresQueryBuilder {
  private table: string
  private filters: FilterMap = {}
  private options: QueryOptions = {}
  private selectCols: string = '*'
  private isSingle: boolean = false
  private isMaybeSingle: boolean = false

  constructor(table: string) {
    this.table = table
  }

  select(columns: string = '*', opts?: { count?: 'exact'; head?: boolean }) {
    this.selectCols = columns
    if (opts?.head) this.options.head = true
    return this
  }

  eq(column: string, value: any) {
    this.filters[column] = value
    return this
  }

  neq(column: string, value: any) {
    this.filters[`${column}__neq`] = value
    return this
  }

  is(column: string, value: any) {
    this.filters[column] = value
    return this
  }

  in(column: string, values: any[]) {
    this.filters[`${column}__in`] = values
    return this
  }

  or(orCondition: string) {
    this.filters['__or'] = orCondition
    return this
  }

  gte(column: string, value: any) {
    this.filters[`${column}__gte`] = value
    return this
  }

  gt(column: string, value: any) {
    this.filters[`${column}__gt`] = value
    return this
  }

  lt(column: string, value: any) {
    this.filters[`${column}__lt`] = value
    return this
  }

  lte(column: string, value: any) {
    this.filters[`${column}__lte`] = value
    return this
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.options.orderBy = column
    this.options.desc = opts?.ascending === false
    return this
  }

  limit(count: number) {
    this.options.limit = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify({
          table: this.table,
          action: 'select',
          filter: this.filters,
          options: this.options,
        }),
      })

      const json = await res.json()
      let data = json.data

      if (this.isSingle || this.isMaybeSingle) {
        data = Array.isArray(data) && data.length > 0 ? data[0] : null
      }

      const result = { data, error: json.error, count: json.count }
      return onfulfilled ? onfulfilled(result) : (result as any)
    } catch (err: any) {
      const result = { data: null, error: err.message || 'PostgreSQL Connection Error', count: 0 }
      return onfulfilled ? onfulfilled(result) : (result as any)
    }
  }

  async insert(data: any) {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: getAuthHeader(),
        credentials: 'include',
        body: JSON.stringify({
          table: this.table,
          action: 'insert',
          data,
        }),
      })
      const json = await res.json()
      return {
        data: json.data,
        error: json.error,
        select: () => ({
          single: async () => ({ data: Array.isArray(json.data) ? json.data[0] : json.data, error: json.error }),
        }),
      }
    } catch (err: any) {
      return { data: null, error: err.message || 'PostgreSQL Insert Error', select: () => ({ single: async () => ({ data: null, error: err.message }) }) }
    }
  }

  update(data: any) {
    const builder = this
    return {
      eq(column: string, value: any) {
        builder.filters[column] = value
        return this
      },
      async then<TResult1 = any>(onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null) {
        try {
          const res = await fetch('/api/db/query', {
            method: 'POST',
            headers: getAuthHeader(),
            credentials: 'include',
            body: JSON.stringify({
              table: builder.table,
              action: 'update',
              filter: builder.filters,
              data,
            }),
          })
          const json = await res.json()
          const result = { data: json.data, error: json.error }
          return onfulfilled ? onfulfilled(result) : (result as any)
        } catch (err: any) {
          const result = { data: null, error: err.message }
          return onfulfilled ? onfulfilled(result) : (result as any)
        }
      },
    }
  }

  delete() {
    const builder = this
    return {
      eq(column: string, value: any) {
        builder.filters[column] = value
        return this
      },
      async then<TResult1 = any>(onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null) {
        try {
          const res = await fetch('/api/db/query', {
            method: 'POST',
            headers: getAuthHeader(),
            credentials: 'include',
            body: JSON.stringify({
              table: builder.table,
              action: 'delete',
              filter: builder.filters,
            }),
          })
          const json = await res.json()
          const result = { data: json.data, error: json.error, count: json.count }
          return onfulfilled ? onfulfilled(result) : (result as any)
        } catch (err: any) {
          const result = { data: null, error: err.message, count: 0 }
          return onfulfilled ? onfulfilled(result) : (result as any)
        }
      },
    }
  }

  upsert(data: any, _opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    return this.insert(data)
  }
}

export const postgres: any = {
  from(table: string) {
    return new PostgresQueryBuilder(table)
  },

  auth: {
    async getSession() {
      if (inMemorySession) {
        return { data: { session: inMemorySession }, error: null }
      }
      try {
        const res = await fetch('/api/auth/user', {
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json()
          if (json.data?.user) {
            inMemorySession = { user: json.data.user }
            return { data: { session: inMemorySession }, error: null }
          }
        }
      } catch {}
      return { data: { session: null }, error: null }
    },

    async getUser() {
      const { data } = await this.getSession()
      return { data: { user: data.session?.user ?? null }, error: null }
    },

    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      try {
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: email?.trim(), password: password || '' }),
        })
        const json = await res.json()
        if (res.ok && json.data?.user) {
          const session = { user: json.data.user }
          setStoredSession(session)
          return { data: { user: json.data.user, session }, error: null }
        }
        return { data: null, error: json.error || { message: 'Authentication failed' } }
      } catch (err: any) {
        return { data: null, error: { message: err.message } }
      }
    },

    async signUp({ email, password, options }: { email: string; password?: string; options?: any }) {
      return this.signInWithPassword({ email, password })
    },

    async signOut() {
      try {
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: getAuthHeader(),
          credentials: 'include',
        }).catch(() => {})
      } finally {
        setStoredSession(null)
      }
      return { error: null }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      listeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback)
            },
          },
        },
      }
    },
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, _file: any) {
          return { data: { path }, error: null }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: path } }
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: path }, error: null }
        },
        async remove(_paths: string[]) {
          return { error: null }
        },
        async list() {
          return { data: [], error: null }
        },
      }
    },
  },

  functions: {
    async invoke(_slug: string, _opts?: any) {
      return { data: null, error: null }
    },
  },
}

export const db = postgres
export const supabase = postgres
export const mangahubDB = postgres

export default postgres
