import { Layout, Page } from "@shopify/polaris";
import ListProducts from "../components/ListProducts";
import { TitleBar } from "@shopify/app-bridge-react";

const Products = () => {
  return (
    <>
      <TitleBar title="Products">        
      </TitleBar>
      <ListProducts />
    </>
  );
};

export default Products;
