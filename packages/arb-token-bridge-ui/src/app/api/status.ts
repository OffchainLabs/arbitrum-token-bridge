import axios from 'axios'
import { NextResponse } from 'next/server'

export type ArbitrumStatusResponse = {
  content: {
    components: {
      id: string
      name: string
      description: string
      status:
        | 'UNDERMAINTENANCE'
        | 'OPERATIONAL'
        | 'DEGRADEDPERFORMANCE'
        | 'PARTIALOUTAGE'
        | 'MAJOROUTAGE'
    }[]
  }
}

const STATUS_URL = 'https://status.arbitrum.io/v2/components.json'

export async function GET(): Promise<
  NextResponse<{
    data: ArbitrumStatusResponse | undefined
    message?: string
  }>
> {
  try {
    const statusSummary = (await axios.get(STATUS_URL)).data
    const resultJson = {
      meta: {
        timestamp: new Date().toISOString()
      },
      content: statusSummary
    }

    return NextResponse.json(
      { data: resultJson as ArbitrumStatusResponse },
      {
        status: 200,
        headers: {
          'Cache-Control': `max-age=0, s-maxage=${10 * 60}`
        }
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message ?? 'Something went wrong',
        data: undefined
      },
      { status: 500 }
    )
  }
}
