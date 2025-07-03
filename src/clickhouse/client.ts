import { createClient, ClickHouseClient, ClickHouseSettings } from '@clickhouse/client-web'

export interface ClickHouseConfig {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  clickhouse_settings?: ClickHouseSettings
  session_id?: string
}

// Default configuration - can be overridden with environment variables
// In Vite, environment variables should start with VITE_ prefix to be exposed to the browser
const defaultConfig: ClickHouseConfig = {
  host: import.meta.env.VITE_CLICKHOUSE_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_CLICKHOUSE_PORT || '8123'),
  username: import.meta.env.VITE_CLICKHOUSE_USERNAME || 'default',
  password: import.meta.env.VITE_CLICKHOUSE_PASSWORD || '',
  database: import.meta.env.VITE_CLICKHOUSE_DATABASE || 'default',
  clickhouse_settings: {
    // Add any default ClickHouse settings here
    async_insert: 1,
    wait_for_async_insert: 0,
  },
}

let clickhouseClient: ClickHouseClient | null = null

export const getClickHouseClient = (config?: Partial<ClickHouseConfig>): ClickHouseClient => {
  if (!clickhouseClient) {
    const finalConfig = { ...defaultConfig, ...config }
    
    clickhouseClient = createClient({
      host: `http://${finalConfig.host}:${finalConfig.port}`,
      username: finalConfig.username,
      password: finalConfig.password,
      database: finalConfig.database,
      clickhouse_settings: finalConfig.clickhouse_settings,
      session_id: finalConfig.session_id,
    })
  }
  
  return clickhouseClient
}