import { Layout, Menu } from "antd";
import { Content, Footer, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import Top from "../Top.tsx";

const Warehouse = () => {
  return (
    <Layout>
      <Layout>
        <Top />
        <Content />
      </Layout>
      <Sider />
    </Layout>
  );
};

export default Warehouse;
