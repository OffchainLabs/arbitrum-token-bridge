import { NextRequest, NextResponse } from 'next/server'
import denylist from '@/public/__auto-generated-denylist.json'

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ data: boolean | undefined; message?: string }>> {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (typeof address !== 'string') {
      return NextResponse.json(
        {
          message: `invalid_parameter: expected 'address' to be a string but got ${typeof address}`,
          data: undefined
        },
        { status: 400 }
      )
    }

    const isDenylisted = new Set(denylist.content).has(address.toLowerCase())

    return NextResponse.json(
      { data: isDenylisted },
      {
        status: 200,
        headers: {
          'Cache-Control': `max-age=0, s-maxage=${ONE_WEEK_IN_SECONDS}`
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
