import {
  Box,
  Flex,
  Heading,
  Icon,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import {
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  NumberInput,
  NumberInputField,
  VStack,
  Center,
} from '@chakra-ui/react';

import { HiExclamationCircle } from '@react-icons/all-files/hi/HiExclamationCircle'
import { NextPage } from 'next'
import useTranslation from 'next-translate/useTranslation'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import Empty from '../../components/Empty/Empty'
import Head from '../../components/Head'
import Image from '../../components/Image/Image'
import Link from '../../components/Link/Link'
import BackButton from '../../components/Navbar/BackButton'
import { useFetchAllErc721And1155Query, useFetchCollectionsForMintQuery } from '../../graphql'
import SmallLayout from '../../layouts/small'
import { useQuery, gql } from '@apollo/client';

const Layout = ({ children }: { children: React.ReactNode }) => (
  <SmallLayout>
    <Head
      title="Create an Event"
      description="Create your Event, Details from your event will be used to also create an NFT securely stored on blockchain"
    />
    {children}
  </SmallLayout>
)

const CreatePage: NextPage = () => {
  const { t } = useTranslation('templates')
  const { back } = useRouter()

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: '',
    numberOfTickets: 0,
    image: ''
  });

  // const { data } = useFetchCollectionsForMintQuery()

  // // useFetchAllErc721And1155Query()
  // const collections = data?.collections

  const GET_COLLECTION = gql(`query FetchCollections {
    collections(
      
      orderBy: CREATED_AT_ASC
      first: 100 # TODO: implement pagination
    ) {
      nodes {
        chainId
        address
        standard
        image
        name
      }
    }
  }`);

  const { loading, error, data } = useQuery(GET_COLLECTION);

  const collections = data?.collections

  
  useEffect(()=>{
    console.log('Data is ', data)
    if(collections){
      const eventNFTAddress = collections.nodes[0].address;
      console.log('eventNFTAddress is ', eventNFTAddress)
    }

  }, [data])

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setEventData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // const { name, value, files } = e.target;

    // // If it's a file input, use the selected file
    // const newValue = name === 'image' ? files[0] : value;

    // setEventData((prevData) => ({
    //   ...prevData,
    //   [name]: newValue,
    // }));

  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // Here, you can send the eventData to your REST API endpoint
    try {
      const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        console.log('Event created successfully!');
        // Optionally, you can redirect the user to another page
      } else {
        console.error('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };


  return (
    <Layout>
      <BackButton onClick={back} />
      <Heading as="h1" variant="title" color="brand.black" mt={6}>
        {t('asset.typeSelector.title')}
      </Heading>
      <Text as="p" variant="text" color="gray.500" mt={3}>
        {t('asset.typeSelector.description')}
      </Text>
      <Flex
        mt={12}
        flexWrap="wrap"
        justify="center"
        align={{ base: 'center', md: 'inherit' }}
        gap={6}
      >
        {!collections ? (
          <>
            <Skeleton w={64} h={344} borderRadius="2xl" />
            <Skeleton w={64} h={344} borderRadius="2xl" />
          </>
        ) : collections.nodes.length === 0 ? (
          <Empty
            title={t('asset.typeSelector.empty.title')}
            description={t('asset.typeSelector.empty.description')}
            icon={
              <Icon as={HiExclamationCircle} w={8} h={8} color="gray.400" />
            }
          />
        ) : (
          collections.nodes.map(
            ({ address, chainId, standard, image, name }) => (
              <Link
                href={`/create/${chainId}/${address}`}
                key={`${chainId}/${address}`}
              >
                <Stack
                  w={64}
                  align="center"
                  spacing={8}
                  rounded="xl"
                  border="1px"
                  borderColor="gray.200"
                  borderStyle="solid"
                  bg="white"
                  p={12}
                  height="full"
                  shadow="sm"
                  _hover={{ shadow: 'md' }}
                  cursor="pointer"
                >
                  <Box
                    position="relative"
                    w={32}
                    h={32}
                    rounded="2xl"
                    overflow="hidden"
                    bg="gray.200"
                  >
                    {image && (
                      <Image
                        src={image}
                        alt={name}
                        fill
                        sizes="128px"
                        objectFit="cover"
                      />
                    )}
                  </Box>
                  <Box textAlign="center">
                    <Heading as="h3" variant="heading1" color="brand.black">
                      {name}
                    </Heading>
                    <Heading as="h5" variant="heading3" color="gray.500" mt={2}>
                      {standard === 'ERC721'
                        ? t('asset.typeSelector.single.type')
                        : t('asset.typeSelector.multiple.type')}
                    </Heading>
                  </Box>
                </Stack>
              </Link>
            ),
          )
        )}
      </Flex>

      <VStack spacing={4} align="start">
        <Center>
          <h1>Create Event</h1>
        </Center>
        <form onSubmit={handleSubmit}>
          <FormControl>
            <FormLabel>Title</FormLabel>
            <Input
              type="text"
              name="title"
              value={eventData.title}
              onChange={handleChange}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={eventData.description}
              onChange={handleChange}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Date</FormLabel>
            <Input
              type="date"
              name="date"
              value={eventData.date}
              onChange={handleChange}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Number of Tickets</FormLabel>
            <NumberInput
              name="numberOfTickets"
              value={eventData.numberOfTickets}
              onChange={(valueString) =>
                setEventData((prevData) => ({
                  ...prevData,
                  numberOfTickets: parseInt(valueString, 10),
                }))
              }
            >
              <NumberInputField />
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Event Image URL</FormLabel>
            <Input
              type="text"
              name="image"
              value={eventData.image}
              onChange={handleChange}
            />
            {/* <Input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
            /> */}
          </FormControl>
          <Button type="submit" colorScheme="blue">
            Create Event
          </Button>
        </form>
      </VStack>
    </Layout>
  )
}

export default CreatePage
