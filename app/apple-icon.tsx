import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default async function AppleIcon() {
  try {
    return new ImageResponse(
      (
        // ImageResponse JSX element
        <div
          style={{
            fontSize: 120,
            background: 'linear-gradient(to right, #66A9EA, #76E8A2)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '20px',
          }}
        >
          S
        </div>
      ),
      // ImageResponse options
      {
        // For convenience, we can re-use the exported icons size metadata
        // config to also set the ImageResponse's width and height.
        ...size,
      }
    )
  } catch (error) {
    console.error('Error generating apple icon:', error)
    // Return a simple response or redirect to static icon
    return new Response('Error generating apple icon', { status: 500 })
  }
}
