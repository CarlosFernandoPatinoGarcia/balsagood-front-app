import React, { createContext, useReducer, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api, { loadApiConfiguration } from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(
        (prevState, action) => {
            switch (action.type) {
                case 'RESTORE_TOKEN':
                    return {
                        ...prevState,
                        userToken: action.token,
                        isLoading: false,
                    };
                case 'SIGN_IN':
                    return {
                        ...prevState,
                        isSignout: false,
                        userToken: action.token,
                    };
                case 'SIGN_OUT':
                    return {
                        ...prevState,
                        isSignout: true,
                        userToken: null,
                    };
            }
        },
        {
            isLoading: true,
            isSignout: false,
            userToken: null,
        }
    );

    useEffect(() => {
        const bootstrapAsync = async () => {
            let userToken;

            try {
                userToken = await AsyncStorage.getItem('userToken');
            } catch (e) {
                console.log('Restoring token failed', e);
            }

            dispatch({ type: 'RESTORE_TOKEN', token: userToken });
        };

        bootstrapAsync();
    }, []);

    const authContext = useMemo(
        () => ({
            signIn: async (data) => {
                try {
                    // Get current base URL to ensure we hit the right server
                    const baseURL = await loadApiConfiguration(); // Or api.defaults.baseURL

                    const response = await axios.post(`${baseURL}/auth/login`, {
                        username: data.username,
                        password: data.password
                    });

                    // Assuming response.data.token contains the JWT
                    // Adjust based on actual backend response structure
                    const { token } = response.data;

                    if (token) {
                        await AsyncStorage.setItem('userToken', token);
                        dispatch({ type: 'SIGN_IN', token: token });
                    } else {
                        throw new Error("No token received");
                    }
                } catch (error) {
                    console.error("Login failed", error);
                    throw error;
                }
            },
            signOut: async () => {
                try {
                    await AsyncStorage.removeItem('userToken');
                } catch (e) {
                    console.error("Logout failed", e);
                }
                dispatch({ type: 'SIGN_OUT' });
            },
            // Helper to get token if needed directly
            getToken: async () => await AsyncStorage.getItem('userToken'),
        }),
        []
    );

    return (
        <AuthContext.Provider value={{ state, authContext }}>
            {children}
        </AuthContext.Provider>
    );
};
