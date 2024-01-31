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
import { unixfs } from '@helia/unixfs'
import { createHelia } from 'helia'
import { json } from '@helia/json'
import { erc721ABI, useAccount, useContractWrite, usePrepareContractWrite, useWalletClient } from 'wagmi'
import { erc1155ABI } from './erc1155';
import { parseAbi, parseEther} from 'viem'
import useSigner from 'hooks/useSigner';
import { BigNumber, ethers } from 'ethers';
import { Client as GW3Client } from 'gw3-sdk';
// import { polygonMumbai } from 'wagmi/dist/chains';

const Layout = ({ children }: { children: React.ReactNode }) => (
  <SmallLayout>
    <Head
      title="Create an Event"
      description="Create your Event, Details from your event will be used to also create an NFT securely stored on blockchain"
    />
    {children}
  </SmallLayout>
)

async function uploadToIpfs(helia:any,  metadata: any, gw3Client: GW3Client){
  

  var blob = new Blob([metadata], { type: 'application/json' });
  var file = new File([blob], "metadata.json", {type: "application/json"});

  return new Promise((resolve,reject)=>{
    let hooks = {
      onProgress: (event: any) => console.log(`Upload progress: ${event.percent}%`),
    
      onSuccess: (body: any) => {
        console.log('Upload success', body);
    
        // After file is uploaded, pin the file using its CID.
        gw3Client.addPin(body.cid)    
          .then(() => {
            console.log('File with CID ${body.cid} has been pinned successfully.')
            resolve(cid);
          })    
          .catch((error: any) => {
            console.log(`Error in pinning file with CID ${body.cid}:`, error)
            reject(error)
          });
      },
    
      onError: (error: any) => {
        console.log('Upload error', error)
        reject(error)
      },
    };
    
    gw3Client.uploadFile(file, hooks);
  })

  


  // create a Helia node
  
  const j = json(helia)

  const cid = await j.add(metadata, {
    onProgress: (evt) => {
      // console.info('adding metadata to  ipfs', evt.type, evt.detail)
    }
  })

  console.log('metadat added to ipfs: ', cid.toString())
  return cid.toString();
}

function createMetadata( eventData: {
  title: string,
  description: string,
  date: any,
  numberOfTickets: number,
  image: string,
  venue: string
}){
  const metadata = {
    "name": eventData.title,
    "description": eventData.description,
    "image": eventData.image,
    "attributes": [
      {
        "trait_type": "Event Name",
        "value": eventData.title
      },
      {
        "trait_type": "Event Date",
        "value": ''+eventData.date
      },
      // {
      //   "trait_type": "Event Time",
      //   "value": "19:00 - 23:00"
      // },
      {
        "trait_type": "Venue",
        "value": eventData.venue
      },
      // {
      //   "trait_type": "Ticket Type",
      //   "value": "VIP"
      // },
      // {
      //   "trait_type": "Ticket ID",
      //   "value": "123456789"
      // },
      {
        "trait_type": "Issuer",
        "value": "Tickie"
      }
    ],
    // "external_url": "https://example.com/event-details",
    // "properties": {
    //   "category": "Concerts",
    //   "location": "City, Country",
    //   "organizer": "Event Ticket Company LLC"
    // }
  }
  return metadata;
}

const CreatePage: NextPage = () => {
  const { t } = useTranslation('templates')
  const { back } = useRouter()

  const [eventData, setEventData] = useState({
    title: 'Confluence 2024',
    description: 'Largest gathering of Web3 Developers',
    date: '',
    numberOfTickets: 10,
    image: 'https://picsum.photos/id/870/600/600?blur=1',
    venue: 'J Town, Lagos, Nigeria'
  });

  const [cid, setCid] = useState('')

  const [heliaClient, setHeliaClient] = useState<any>();

  const [gw3Client,setGW3Client] = useState<GW3Client>();

  

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

    let client = new GW3Client('5aa63a63-5df5-4ea5-9e8a-1646a4ec87c4', 'wVZtYcC8Bk1N8jiXRLQJKi2yDjCkNmo1H30I3UEh-b9teuQsbjdYzsulEeOayZOyQ-5e3O4MB25ai8addWh7hQ==');
    setGW3Client(client);

    createHelia().then((helia)=>{
      setHeliaClient(helia)
      console.log('Helia done')
    }).catch((err)=>{
      console.error('Error initing Helia: ', err)
    })
    
  }, [])
  
  useEffect(()=>{
    console.log('Data is ', data)
    if(collections){
      const eventNFTAddress = collections.nodes[0].address;
      console.log('eventNFTAddress is ', eventNFTAddress)
    }

  }, [data])

  const {address, isConnected} = useAccount();

   

  const signer = useSigner();

  //@ts-ignore
  const erc1155ABI1 =  parseAbi([
    //  ^? const abi: readonly [{ name: "balanceOf"; type: "function"; stateMutability:...
    'function balanceOf(address owner) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 amount)',
    'function mint(uint ticketQuantity, string memory metadataUri) public payable'
  ])
  // console.log(erc1155ABI1, erc1155ABI)
  // const { config, error: pError, isLoading: pLoading } = usePrepareContractWrite({
  //   address: '0x7a36F00Eee656E1a1E0f6d6cC7Ec4A09D542a54f',
  //   abi: erc1155ABI1, // erc1155ABI,
  //   functionName: 'mint',
  //   args: [ BigInt(eventData.numberOfTickets), `ipfs://${cid}`],
  //   chainId: 80001,//polygonMumbai.id,
  //   value: parseEther('0.00001'),
  //   walletClient: wc
  // })

  // console.log('configgg: ', config)

  // console.log('pLoading: ', pLoading, ', pError', pError)
  // const { data: contractWriteData, isLoading, isSuccess, write, error: contractError } = useContractWrite({
  //   address: '0x7a36F00Eee656E1a1E0f6d6cC7Ec4A09D542a54f',
  //   abi: erc1155ABI1, // erc1155ABI,
  //   functionName: 'mint',
  //   args: [ BigInt(eventData.numberOfTickets), `ipfs://${cid}`],
  //   chainId: 80001,//polygonMumbai.id,
  //   value: parseEther('0.00001')
  // })


  
  // console.log('config.result: ', config.result)
  // console.log('contractError: ', contractError)
  

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

    
    try {

      const metadata = createMetadata(eventData);

      const cidU = await uploadToIpfs(heliaClient, metadata);
      console.log('CID returned is ', cidU)
      setCid(cidU);

      console.log('CID in state is ', cid)

      const ctrct = new ethers.Contract('0x7a36F00Eee656E1a1E0f6d6cC7Ec4A09D542a54f',erc1155ABI1,signer );

      const tx = await ctrct.mint(BigNumber.from(eventData.numberOfTickets), `ipfs://${cidU}`, {
        value: ethers.utils.parseEther('0.00001')
      });
      await tx.wait();
      // console.log('Write is ', write)

      // if(write){
      //   write();
      // }

      
      // const response = await fetch('YOUR_API_ENDPOINT', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(eventData),
      // });

      // if (response.ok) {
      //   console.log('Event created successfully!');
      //   // Optionally, you can redirect the user to another page
      // } else {
      //   console.error('Failed to create event');
      // }
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
            <FormLabel>Venue</FormLabel>
            <Input
              type="text"
              name="venue"
              value={eventData.venue}
              onChange={handleChange}
            />
            
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

      {/* {
        isLoading && 
        <Text as="p" variant="text" color="gray.500" mt={3}>
        Creating Event ...
      </Text>
      }
      <br/>
      {
        isSuccess && <Text as="p" variant="text" color="gray.500" mt={3}>
        Event Created Successfully
      </Text>
      } */}
    </Layout>
  )
}

export default CreatePage
