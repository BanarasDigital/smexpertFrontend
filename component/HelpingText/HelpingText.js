import React from 'react'
import { Text, View } from 'react-native'

const HelpingText = ({text1, text2}) => {
    return (
        <View>
            <Text style={{ color: 'white', fontSize: 64 }}>{text1}</Text>
            <Text style={{ color: 'white', fontSize: 64, marginBottom: 40 }}>{text2}</Text>
        </View>
    )
}

export default HelpingText
