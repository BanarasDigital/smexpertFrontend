import React from 'react'
import { Text, View } from 'react-native'
import { darkGreen } from '../Constants'

const Heading = ({ mainHeading, subHeading }) => {
  return (
  
     <View style={{width : "80%"}}>
          
         <Text style={{ fontSize: 40, color: darkGreen, fontWeight: 'bold' }}>
            {mainHeading}
          </Text>
          <Text
            style={{
              color: 'grey',
              fontSize: 19,
              fontWeight: 'bold',
              marginBottom: 20,
            }}>
            {subHeading}
          </Text>
          </View>
  )
}

export default Heading
