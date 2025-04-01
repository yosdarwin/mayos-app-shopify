import React, { useEffect, useState } from "react";
import {
  Card,
  Text,
  IndexTable,
  useBreakpoints,
  Grid,
  Button,
  ButtonGroup,
  Pagination,
  TextField,
  Page,
  Layout,
} from "@shopify/polaris";

const ListProducts = () => {
  const [products, setProducts] = useState([]);
  const [pageInfo, setPageInfo] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [startCursor, setStartCursor] = useState(null);
  const [endCursor, setEndCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const breakpoint = useBreakpoints().smDown;

  const [inputSearch, setInputSearch] = useState("");

  const fetchProducts = async (cursor = null, btnClick = "") => {
    try {
      const url = cursor
        ? `/api/get-products?cursor=${cursor}&btnClick=${btnClick}`
        : "/api/get-products";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setProducts(data.data.products.edges);
      setPageInfo(data.data.products.pageInfo);
      setStartCursor(data.data.products.pageInfo.startCursor);
      setEndCursor(data.data.products.pageInfo.endCursor);
      setLoading(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the first page of products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Load the next page of products
  const loadNextPage = () => {
    fetchProducts(endCursor, "next");
  };

  // Load the previous page of products
  const loadPreviousPage = () => {
    fetchProducts(startCursor, "prev");
  };

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row id={product.node.id} key={product.node.id} position={index}>
      <IndexTable.Cell>
        <Text>{product.node.title}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{product.node.description}</IndexTable.Cell>
      <IndexTable.Cell>
        <Grid gap={6}>
          {product.node.media.edges.map((img, i) => {
            if (img.node.image) {
              return (
                <Grid.Cell
                  key={i}
                  columnSpan={{ xs: 6, sm: 3, md: 3, lg: 6, xl: 6 }}
                >
                  <img
                    key={i}
                    src={img.node.image.url}
                    alt={img.node.image.alt}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                    }}
                  />
                </Grid.Cell>
              );
            }
          })}
        </Grid>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ButtonGroup>
          <Button variant="primary">Edit</Button>
          <Button variant="primary" tone="critical">
            Delete
          </Button>
        </ButtonGroup>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 8, lg: 10, xl: 10 }}>
              <TextField
                value={inputSearch}
                onChange={(e) => setInputSearch(e.target.value)}
                type="text"
                placeholder="Type title product here..."
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 4, lg: 2, xl: 2 }}>
              <Button variant="primary">Search</Button>
            </Grid.Cell>
          </Grid>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              condensed={breakpoint}
              resourceName={resourceName}
              itemCount={products.length}
              headings={[
                { title: "Title" },
                { title: "Description" },
                { title: "Image" },
                { title: "Action" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
            <Pagination
              onPrevious={() => {
                loadPreviousPage();
              }}
              onNext={() => {
                loadNextPage();
              }}
              type="table"
              hasPrevious={pageInfo.hasPreviousPage}
              hasNext={pageInfo.hasNextPage}
              label={`1-${products.length} of ${products.length} products`}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default ListProducts;
