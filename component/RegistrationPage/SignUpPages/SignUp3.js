import React, { useState } from 'react';
import { View, Text, Touchable, TouchableOpacity, TextInput, Button, ActivityIndicator } from 'react-native';
import { darkGreen } from '../../Constants';
import Field from '../../Field';
import Btn, { Btn2 } from '../../Btn';
import Background from '../../Background';
import axios from 'axios';
import { API_BASE_URL } from '../../../config';
import { globalStyles } from '../../../styles/global';
import { Formik } from 'formik';
import generateValidationSchema from '../../GenrateValidationSchema/genrateValidationSchema';
import genrateInitalValues from '../../genrateInitialValues/InitialValues';
import Ionicons from "react-native-vector-icons/Ionicons"
import Heading from '../../headings/Heading';
import registerFormArr3 from '../SignUpArr/SignUpArr3';
import DatePickerModal from 'react-native-datepicker-modal';


const SignUpForm3 = (m_props) => {

    const validationSchema = generateValidationSchema(registerFormArr3);
    const initialValues = genrateInitalValues(registerFormArr3);

    return (
        // <Background>
        <View style={{ alignItems: 'center', width: 400, marginTop: "10%" }}>
            <View
                style={{
                    backgroundColor: 'white',
                    height: 700,
                    width: 370,
                    borderTopLeftRadius: 30,
                    paddingTop: 30,
                    alignItems: 'center',
                }}>
                <View style={{

                    flexDirection: 'row', alignItems: 'flex-start', width: "100%"
                }}>

                    <Ionicons name={"arrow-back"} size={20} color={"black"} style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        paddingHorizontal: 20,
                    }} />
                </View>

                <Heading mainHeading={"Create Account"} subHeading={"Set Secure Password"} />

                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={(values, actions) => {
                        // setButton(true);
                        m_props.navigation.navigate("Signup3")
                    }}
                >
                    {props => (
                        <View
                            style={{ width: "80%" }}>
                            {registerFormArr3.map((element, index) => {
                                const borderColor = props.errors[element.name] ? { color: "red", borderSz: 2 } : props.touched[element.name] ? { color: 'green', borderSz: 2 } : { color: 'black', borderSz: 1 }
                                return (
                                    <>
                                        <DatePickerModal
                                            // Add necessary props here
                                            style={{ borderRadius: 10, color: darkGreen, paddingHorizontal: 10, backgroundColor: 'rgb(220,220, 220)', marginVertical: 10, height: "14%", borderColor: borderColor.color, borderWidth: borderColor.borderSz }}
                                            placeholder={element.placeholder}
                                            date={props.values[element.name]} // Assuming you store the date value in your form values
                                            onConfirm={(date) => props.setFieldValue(element.name, date)} // Update form value on confirm
                                            onPressCancel={() => props.setFieldValue(element.name, null)} // Clear the field if canceled
                                            buttonCancelText="Cancel" // Customize cancel button text
                                            buttonConfirmText="Confirm" // Customize confirm button text
                                        />
                                        {props.errors[element.name] ? (
                                            <Text style={{ color: "red" }}>{props.errors[element.name]}</Text>
                                        ) : null}
                                    </>
                                );
                            })}
                            <Btn textColor='white' bgColor={darkGreen} btnLabel="Next" Press={props.handleSubmit} width={"100%"} />
                            <Btn2 textColor={"green"} btnLabel="Already Have an Account" Press={() => { m_props.navigation.navigate("Login") }} width={"100%"} />
                        </View>
                    )}
                </Formik>
            </View>
        </View>
        // </Background>
    );
};

export default SignUpForm3;