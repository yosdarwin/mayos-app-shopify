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
} from "@shopify/polaris";

const ListProducts = () => {
  const [products, setProducts] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]); // Store history of cursors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async (cursor = null) => {
    try {
      const url = cursor
        ? `/api/get-products?cursor=${cursor}`
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
      setCursor(
        data.data.products.edges[data.data.products.edges.length - 1]?.cursor ||
          null
      );
      setHasNextPage(data.data.products.pageInfo.hasNextPage);

      // Update cursor history
      if (cursor) {
        setCursorHistory((prevHistory) => {
          const newHistory = [...prevHistory, cursor];
          console.log("Updated cursorHistory (Next Page):", newHistory); // Debugging
          return newHistory;
        });
      } else {
        setCursorHistory([]); // Reset history when fetching the first page
        console.log("Reset cursorHistory (First Page):", []); // Debugging
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sync hasPrevPage with cursorHistory
  useEffect(() => {
    console.log("cursorHistory (useEffect):", cursorHistory); // Debugging
    setHasPrevPage(cursorHistory.length > 0);
  }, [cursorHistory]);

  // Fetch the first page of products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Load the next page of products
  const loadNextPage = () => {
    if (cursor) {
      setLoading(true);
      fetchProducts(cursor);
    }
  };

  // Load the previous page of products
  const loadPreviousPage = () => {
    if (cursorHistory.length > 0) {
      setLoading(true);

      // Remove the last cursor from history (go back one page)
      const previousCursors = [...cursorHistory];
      previousCursors.pop(); // Remove the last cursor
      const previousCursor =
        previousCursors[previousCursors.length - 1] || null;

      // Fetch products using the previous cursor
      fetchProducts(previousCursor);

      // Update cursor history
      setCursorHistory(previousCursors);
      console.log("Updated cursorHistory (Previous Page):", previousCursors); // Debugging
    }
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

  return (
    <Card>
      <IndexTable
        condensed={useBreakpoints().smDown}
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
          console.log("Previous");
          loadPreviousPage();
        }}
        onNext={() => {
          console.log("Next");
          loadNextPage();
        }}
        type="table"
        hasPrevious={hasPrevPage} // Enable "Previous" button if there's a previous page
        hasNext={hasNextPage} // Enable "Next" button if there's a next page
        label={`1-${products.length} of ${products.length} products`} // Use backticks for template literals
      />
    </Card>
  );
};

export default ListProducts;
