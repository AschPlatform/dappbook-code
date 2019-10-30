
export default [
  {
    path: '/',
    component: () => import('layouts/overView/overView')
  },
  {
    path: '/article/:id',
    component: () => import('layouts/articleDetail/articleDetail')
  },
  {
    path: '/personal',
    component: () => import('layouts/personal/personal')
  },
  {
    path: '/launch',
    component: () => import('pages/launchIssue')
  },
  {
    path: '/apply',
    component: () => import('pages/applyChannel')
  },
  {
    path: '/issue',
    component: () => import('pages/issueDetail')
  },
  {
    path: '/transfer',
    component: () => import('pages/transfer')
  },
  {
    path: '/charge',
    component: () => import('pages/charge')
  },

  { // Always leave this as last one
    path: '*',
    component: () => import('pages/404')
  }
]
