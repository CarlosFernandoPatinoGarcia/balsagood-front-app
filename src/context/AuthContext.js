import React, { createContext, useReducer, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../api/api';

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
            signIn: async ({ username, password }) => {
                try {
                    const response = await api.post('/api/auth/login', {
                        usuarioNombre: username,
                        usuarioClave: password
                    });

                    let token = null;

                    if (typeof response.data === 'string') {
                        token = response.data;
                    } else if (response.data.token) {
                        token = response.data.token;
                    } else if (response.data.accessToken) {
                        token = response.data.accessToken;
                    } else if (response.data.jwt) {
                        token = response.data.jwt;
                    }

                    if (token) {
                        await AsyncStorage.setItem('userToken', token);
                        dispatch({ type: 'SIGN_IN', token: token });
                    } else {
                        throw new Error("No token received. Response: " + JSON.stringify(response.data));
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
