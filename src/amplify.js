import { Amplify } from 'aws-amplify'

const endpoint = process.env.REACT_APP_APPSYNC_ENDPOINT

if (!endpoint) {
  throw new Error(
    'REACT_APP_APPSYNC_ENDPOINT environment variable is required. ' +
    'Set it in .env file or export before starting the app.'
  )
}

Amplify.configure({
  API: {
    GraphQL: {
      endpoint,
      region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
      defaultAuthMode: 'lambda',
    },
  },
})
