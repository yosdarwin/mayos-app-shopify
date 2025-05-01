import { Button, Card, Layout, LegacyCard, Link, Page, Text } from '@shopify/polaris'
import React, { useEffect } from 'react'

const index = () => {
  const [shop, setShop] = React.useState({
    email: "",
    domain: ""
  });

  // Fetch shop info on component mount
  useEffect(()=>{
    const GetShopInfo=async()=>{
      try {
        const res = await fetch(`/api/store-info`,{
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        if(!res.ok){
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        // Correctly update the shop state with data from the API
        setShop({
          email: data.data.shop.email,
          domain: data.data.shop.myshopifyDomain
        });
      } catch (error) {
        console.log(error)
      }
    }

    GetShopInfo()
  },[])

  // Log shop state when it changes
  useEffect(() => {
    console.log("shop state updated:", shop)
  }, [shop])

  return (
    <Page>
      <Layout.Section >
        <Card title="Home">
          <Text as="p">Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis optio, autem dolores amet odio exercitationem, quod, culpa veritatis delectus blanditiis esse fuga.</Text>
          <Button onClick={() => {
            // Get API key from meta tag
            const apiKey = document.querySelector('meta[name="shopify-api-key"]')?.getAttribute('content');
            window.open(`https://mayos-dev.myshopify.com/admin/themes/current/editor?template=product&addAppBlockId=${apiKey}/custom_price&target=mainSection`, "_blank")
          }}>Add Custom Price Button</Button>
        </Card>
      </Layout.Section>
    </Page>
  )
}

export default index
