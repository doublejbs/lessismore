import { stackflow } from '@stackflow/react/future';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { config } from './StackflowConfig';
import WarehouseWrapper from './warehouse/component/WarehouseWrapper';
import WarehouseWebViewDetailWrapper from './warehouse-detail/component/WarehouseWebViewDetailWrapper';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import BagView from './bag/component/BagView';
import BagDetailWrapper from './bag-detail/BagDetailWrapper';
import GearEditWrapperView from './gear-edit/component/GearEditWrapperView';
import TermsAgreement from './TermsAgreement';
import BagShareWrapper from './bag-share/component/BagShareWrapper';
import BagEditWebViewWrapper from './bag-edit-add-gear/BagEditWebViewWrapper';
import BagUselessWebViewWrapper from './bag-useless/component/BagUselessWebViewWrapper';
import CustomGearWrapper from './custom-gear/component/CustomGearWrapper';
import SearchWarehouseWrapper from './search-warehouse/component/SearchWarehouseWrapper';
import InfoView from './info/InfoView';
import OpenBrowserView from './open-browser/OpenBrowserView';
import ManageView from './manage/ManageView';
import CelebrateView from './celebrate/CelebrateView';

export const { Stack, actions } = stackflow({
  config,
  components: {
    WarehouseWrapper,
    WarehouseWebViewDetailWrapper,
    BagView,
    BagDetailWrapper,
    GearEditWrapperView,
    TermsAgreement,
    BagShareWrapper,
    BagUselessWebViewWrapper,
    BagEditWebViewWrapper,
    CustomGearWrapper,
    SearchWarehouseWrapper,
    InfoView,
    OpenBrowserView,
    ManageView,
    CelebrateView,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({
      theme: 'cupertino',
    }),
    historySyncPlugin({
      config,
      fallbackActivity: () => 'WarehouseWrapper',
    }),
  ],
});
