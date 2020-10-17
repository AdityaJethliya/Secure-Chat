import React, { useState, useEffect } from "react";
import queryString from 'query-string';
import io from "socket.io-client";

import TextContainer from '../TextContainer/TextContainer';
import Messages from '../Messages/Messages';
import InfoBar from '../InfoBar/InfoBar';
import Input from '../Input/Input';

import './Chat.css';

let socket;
const crypt = new window.JSEncrypt({ default_key_size: 2056 })
const privateKey = crypt.getPrivateKey()
const publicKey = crypt.getPublicKey()

const Chat = ({ location }) => {
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const [users, setUsers] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [publicKeys, setPublicKeys] = useState([]);
    const ENDPOINT = 'https://react-encrypted-chat.herokuapp.com/';




    const encrypt = (content, key) => {
        crypt.setKey(key)
        return crypt.encrypt(content)
    }

    /** Decrypt the provided string with the local private key */
    const decrypt = (content) => {
        crypt.setKey(privateKey)
        return crypt.decrypt(content)
    }

    useEffect(() => {

        const { name, room } = queryString.parse(location.search);

        socket = io(ENDPOINT);

        setRoom(room);
        setName(name)

        socket.emit('join', { name, room, publicKey }, (error) => {
            if (error) {
                alert(error);
            }
        });

    }, [ENDPOINT, location.search]);

    useEffect(() => {
        socket.on('message', message => {
            // console.log(message)
            if (message.user === 'admin') {
                const adminMessage = { text: message.text, user: message.user }
                setMessages(messages => [...messages, adminMessage]);
            }
            else if (message.publicKey === publicKey) {
                const decryptedMessage = { text: decrypt(message.text), user: message.user }
                setMessages(messages => [...messages, decryptedMessage]);
            }
        });

        socket.on('GET_PUBLIC_KEYS', ({ keys }) => {
            if (keys) {
                setPublicKeys(pubKeys => [...pubKeys, ...keys])
            }
            // console.log(`public keys are ${publicKeys}`)
        })

        socket.on('NEW_CONNECTION', ({ pubKey }) => {
            // console.log(`new connection public key - ${pubKey}`)
            setPublicKeys(pubKeys => [...pubKeys, pubKey])
            // console.log(`public keys are ${publicKeys}`)
        })

        socket.on("roomData", ({ users }) => {
            setUsers(users);
        });
    }, []);

    const sendMessage = (event) => {
        event.preventDefault();
        // console.log(publicKeys, publicKeys.length)
        if (message) {
            publicKeys.forEach(key => {
                const encryptedMessage = encrypt(message, key)
                // console.log(`encrypted message is -${encryptedMessage}`)
                socket.emit('sendMessage', { message: encryptedMessage, publicKey: key });
            });

        }
    }

    /** Encrypt the provided string with the destination public key */


    return (
        <div className="outerContainer">
            <div className="container">
                <InfoBar room={room} />
                <Messages messages={messages} name={name} />
                <Input message={message} setMessage={setMessage} sendMessage={sendMessage} />
            </div>
            {/* <TextContainer users={users} /> */}
        </div>
    );
}

export default Chat;