import { NextApiRequest, NextApiResponse } from 'next'
import denylist from '../../../public/__auto-generated-denylist.json'

type Request = NextApiRequest & { query: { address: string } }

export default async function handler(
  req: Request,
  res: NextApiResponse<{ data: boolean | undefined; message?: string }>
) {
  try {
    // validate method
    if (req.method !== 'GET') {
      res
        .status(400)
        .send({ message: `invalid_method: ${req.method}`, data: undefined })
      return
    }

    const { address } = req.query

    if (typeof address !== 'string') {
      res.status(500).send({
        message: `invalid_parameter: expected 'address' to be a string but got ${typeof address}`,
        data: undefined
      })
      return
    }

    const isDenylisted = new Set(denylist.content).has(address.toLowerCase())

    res.status(200).json({ data: isDenylisted })
  } catch (error: any) {
    res.status(500).json({
      message: error?.message ?? 'Something went wrong',
      data: undefined
    })
  }
}
