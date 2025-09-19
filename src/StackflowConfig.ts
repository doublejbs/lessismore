import { defineConfig } from '@stackflow/config';

export const config = defineConfig({
  activities: [
    {
      name: 'WarehouseWrapper',
      route: '/',
    },
    {
      name: 'WarehouseWrapper',
      route: '/warehouse',
    },
    {
      name: 'BagView',
      route: '/bag',
    },
    {
      name: 'BagDetailWrapper',
      route: {
        path: '/bag/:id',
        decode: (params: any) => ({
          id: params.id,
        }),
      },
    },
    {
      name: 'GearEditWrapperView',
      route: {
        path: '/warehouse/edit/:id',
        decode: (params: any) => ({
          id: params.id,
        }),
      },
    },
    {
      name: 'WarehouseWebViewDetailWrapper',
      route: {
        path: '/warehouse/detail/:id',
        decode: (params: any) => ({
          id: params.id,
        }),
      },
    },
    { name: 'TermsAgreement', route: '/terms-agreement' },
    { name: 'BagShareWrapper', route: '/bag-share/:id' },
    { name: 'BagUselessWebViewWrapper', route: '/bag/:id/useless' },
    { name: 'BagEditWebViewWrapper', route: '/bag/:id/edit' },
    { name: 'CustomGearWrapper', route: '/warehouse/custom' },
    { name: 'AdminView', route: '/admin' },
    { name: 'SearchWarehouseWrapper', route: '/search' },
    { name: 'ManageView', route: '/manage' },
    { name: 'InfoView', route: '/info' },
    { name: 'OpenBrowserView', route: '/open-browser' },
    { name: 'CelebrateView', route: '/celebrate' },
  ],
  transitionDuration: 270,
  initialActivity: () => 'WarehouseWrapper',
});
