import { Layout, Page } from "@shopify/polaris";
import ListProducts from "../components/ListProducts";
import { TitleBar } from "@shopify/app-bridge-react";

const Products = () => {
  return (
    <>
      <TitleBar title="Products">
        <button variant="primary">Add New Product</button>
      </TitleBar>

      <ListProducts />
    </>
  );
};

export default Products;
