import React from 'react'
import Spinner from 'react-native-loading-spinner-overlay'

const LoadingSpinner = () => {
  return (
    <Spinner
    visible={true} // set to true to show the spinner
    textContent={'Loading...'} // optional text to display
    textStyle={{ color: 'white' }} // optional styling for the text
    animation="fade" // animation type (fade, slide, none)
    overlayColor="rgba(0, 0, 0, 0.5)" // color of the overlay
    size="large" // size of the spinner (small, normal, large)
    color="white" // color of the spinner
/>
  )
}

export default LoadingSpinner
