import React, { useEffect, useState, useCallback } from "react";
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
  Toast,
  Frame,
  Modal,
  Select,
} from "@shopify/polaris";

const ListProducts = () => {
  const [products, setProducts] = useState([]);
  const [pageInfo, setPageInfo] = useState([]);
  const [startCursor, setStartCursor] = useState(null);
  const [endCursor, setEndCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const breakpoint = useBreakpoints().smDown;
  const [existingProducts, setExistingProducts] = useState([]);
  const [storeName, setStoreName] = useState("");
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);
  const [deleteModalActive, setDeleteModalActive] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editModalActive, setEditModalActive] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    product_id: '',
    name_store: '',
    description: ''
  });

  const [inputSearch, setInputSearch] = useState("");

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  const fetchProducts = async (cursor = null, btnClick = "", search = "") => {
    try {
      const url = cursor
        ? `/api/get-products?cursor=${cursor}&btnClick=${btnClick}&search=${search}&perPage=${itemsPerPage}`
        : `/api/get-products?search=${search}&perPage=${itemsPerPage}`;

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
      // Success case handled
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  // Fetch store information
  const fetchStoreInfo = async () => {
    try {
      const response = await fetch('/api/store-info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setStoreName(data.data.shop.name);
    } catch (error) {
      console.error('Error fetching store info:', error);
    }
  };

  // Fetch existing products from database
  const fetchExistingProducts = async () => {
    try {
      const response = await fetch('/api/existing-products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setExistingProducts(data.data);
      } 
    } catch (error) {
      console.error('Error fetching existing products:', error);
    }
  };

  // Fetch total product count from Shopify
  const fetchTotalProductCount = async () => {
    try {
      const response = await fetch('/api/products/count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setTotalProductCount(data.count);
    } catch (error) {
      console.error('Error fetching product count:', error);
    }
  };

  // Fetch the first page of products on mount and existing products
  useEffect(() => {
    fetchProducts();
    fetchExistingProducts();
    fetchStoreInfo();
    fetchTotalProductCount();
    setCurrentPage(1);
  }, [itemsPerPage]); // Re-fetch when items per page changes

  // Load the next page of products
  const loadNextPage = () => {
    fetchProducts(endCursor, "next");
    setCurrentPage(prev => prev + 1);
  };

  // Load the previous page of products
  const loadPreviousPage = () => {
    fetchProducts(startCursor, "prev");
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  // search product
  const SearchProduct = () => {
    fetchProducts(null, "", inputSearch);
    setCurrentPage(1);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
    fetchProducts(null, "", inputSearch);
  };

// Add product
const handleAddProduct = async (productId) => {
  try {
    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    const response = await fetch("/api/add-product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify({
        product_id: productId,
        name_store: storeName,
        description: ''
      }),
    });

    if (response.ok) {
      // Refresh the list of existing products
      fetchExistingProducts();

      // Show success toast
      setToastMessage(`Product added successfully`);
      setToastError(false);
      setToastActive(true);
    } else {
      // Show error toast
      setToastMessage('Failed to add product');
      setToastError(true);
      setToastActive(true);
    }
  } catch (error) {
    console.error('Error adding product:', error);
    // Show error toast
    setToastMessage('Error adding product: ' + error.message);
    setToastError(true);
    setToastActive(true);
  }
}

// Show delete confirmation modal
const confirmDelete = (productId) => {
  setProductToDelete(productId);
  setDeleteModalActive(true);
};

// Handle delete modal close
const handleDeleteModalClose = () => {
  setDeleteModalActive(false);
  setProductToDelete(null);
};

// Handle edit modal close
const handleEditModalClose = () => {
  setEditModalActive(false);
  setProductToEdit(null);
  setEditFormData({
    id: '',
    product_id: '',
    name_store: '',
    description: ''
  });
};

// Show edit form in modal
const showEditForm = (productId) => {
  // Find the product in existingProducts
  const product = existingProducts.find(item => item.product_id === productId);
  if (product) {
    setProductToEdit(product);
    setEditFormData({
      id: product.id,
      product_id: product.product_id,
      name_store: storeName,
      description: product.description
    });
    setEditModalActive(true);
  }
};

// Handle form field changes
const handleEditFormChange = (field, value) => {
  setEditFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

// Update product
const handleUpdateProduct = async () => {
  try {
    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    const response = await fetch("/api/update-product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify(editFormData),
    });

    if (response.ok) {
      // Refresh the list of existing products
      fetchExistingProducts();

      // Show success toast
      setToastMessage(`Product updated successfully`);
      setToastError(false);
      setToastActive(true);

      // Close the modal
      handleEditModalClose();
    } else {
      const errorData = await response.json();
      // Show error toast
      setToastMessage(errorData.message || 'Failed to update product');
      setToastError(true);
      setToastActive(true);
    }
  } catch (error) {
    console.error('Error updating product:', error);
    // Show error toast
    setToastMessage('Error updating product: ' + error.message);
    setToastError(true);
    setToastActive(true);
  }
};

// Delete product
const handleDeleteProduct = async () => {
  if (!productToDelete) return;

  try {
    // Get CSRF token from meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    // First try the authenticated endpoint
    let response = await fetch('/api/delete-product', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify({
        product_id: productToDelete
      }),
    });

    // If that fails, try the test endpoint (for development)
    if (!response.ok && response.status === 405) {
      console.log('Authenticated delete failed');
    }

    if (response.ok) {
      // Refresh the list of existing products
      fetchExistingProducts();

      // Show success toast
      setToastMessage("Product deleted successfully");
      setToastError(false);
      setToastActive(true);
    } else {
      const errorData = await response.json();
      // Show error toast
      setToastMessage(errorData.message || 'Failed to delete product');
      setToastError(true);
      setToastActive(true);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    // Show error toast
    setToastMessage('Error deleting product: ' + error.message);
    setToastError(true);
    setToastActive(true);
  } finally {
    // Close the modal
    handleDeleteModalClose();
  }
}

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const rowMarkup =
    products.map((product, index) => (
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
            {/* Only show Add button if product doesn't exist in database */}
            {!existingProducts.some(item => item.product_id === product.node.id.split('/').pop()) && (
              <Button onClick={() => handleAddProduct(product.node.id.split('/').pop())} variant="primary" tone="success">Add</Button>
            )}
            {existingProducts.some(item => item.product_id === product.node.id.split('/').pop()) && (
              <Button onClick={() => showEditForm(product.node.id.split('/').pop())} variant="primary">Edit</Button>
            )}
            {/* Only show Delete button if product exists in database */}
            {existingProducts.some(item => item.product_id === product.node.id.split('/').pop()) && (
              <Button onClick={() => confirmDelete(product.node.id.split('/').pop())} variant="primary" tone="critical">Delete</Button>
            )}
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ));

  if (loading) {
    return <Page>
      <Layout>
        <Layout.Section>
          <Text as="p" alignment="center">Loading...</Text>
        </Layout.Section>
      </Layout>
      </Page>;
  }

  const toastMarkup = toastActive ? (
    <Toast
      content={toastMessage}
      error={toastError}
      onDismiss={toggleToast}
    />
  ) : null;

  // Delete confirmation modal
  const deleteModalMarkup = (
    <Modal
      open={deleteModalActive}
      onClose={handleDeleteModalClose}
      title="Delete Product"
      primaryAction={{
        content: 'Delete',
        destructive: true,
        onAction: handleDeleteProduct,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleDeleteModalClose,
        },
      ]}
    >
      <Modal.Section>
        <Text>Are you sure you want to delete this product? This action cannot be undone.</Text>
      </Modal.Section>
    </Modal>
  );

  // Edit product modal
  const editModalMarkup = (
    <Modal
      open={editModalActive}
      onClose={handleEditModalClose}
      title="Edit Product"
      primaryAction={{
        content: 'Save',
        onAction: handleUpdateProduct,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleEditModalClose,
        },
      ]}
    >
      <Modal.Section>
        <Layout>
          <Layout.Section>
            <TextField
              label="Product ID"
              value={editFormData.product_id}
              onChange={(value) => handleEditFormChange('product_id', value)}
              autoComplete="off"
            />
          </Layout.Section>
          <Layout.Section>
            <TextField
              label="Store Name"
              value={editFormData.name_store}
              onChange={(value) => handleEditFormChange('name_store', value)}
              autoComplete="off"
            />
          </Layout.Section>
          <Layout.Section>
            <TextField 
              multiline={4}
              label="Description"
              value={editFormData.description ? editFormData.description : ''}
              onChange={(value) => handleEditFormChange('description', value)}
              autoComplete="off"
            />
          </Layout.Section>
        </Layout>
      </Modal.Section>
    </Modal>
  );

  return (
    <Frame>
      {toastMarkup}
      {deleteModalMarkup}
      {editModalMarkup}
      <Page>
        <Layout>
          <Layout.Section>
            {/* Search and filter section */}

                <Grid gap="4">
                  <Grid.Cell columnSpan={{ xs: 5, sm: 5, md: 5, lg: 8, xl: 8 }}>
                    <TextField
                      value={inputSearch}
                      onChange={setInputSearch}
                      type="text"
                      placeholder="Type title product here..."
                      fullWidth
                    />
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 1, sm: 1, md: 1, lg: 2, xl: 2 }}>
                    <div style={{ height: '100%', display: 'flex' }}>
                      <Button variant="primary" onClick={SearchProduct} fullWidth style={{ height: '100%' }}>Search</Button>
                    </div>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 2, xl: 2 }}>
                    <Select
                        fullWidth
                        label="Per page"
                        labelInline
                        options={[
                          {label: '3', value: '3'},
                          {label: '5', value: '5'},
                          {label: '10', value: '10'},
                          {label: '20', value: '20'},
                        ]}
                        value={itemsPerPage.toString()}
                        onChange={handleItemsPerPageChange}
                    />
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
              {loading ? (<IndexTable.Row>
                <IndexTable.Cell>
                  <Text as="p" alignment="center">Loading...</Text>
                </IndexTable.Cell>
                </IndexTable.Row>) : rowMarkup}
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
              label={`${products.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-${((currentPage - 1) * itemsPerPage) + products.length} of ${totalProductCount} products`}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
    </Frame>
  );
};

export default ListProducts;
