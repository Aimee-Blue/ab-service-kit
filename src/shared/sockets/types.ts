import WebSocket from 'ws';
import * as http from 'http';
import * as https from 'https';

export type SocketWithInfo = WebSocket & { id: string; closingByKit: boolean };

export type MessageWithInfo = http.IncomingMessage & { id: string };

export type Server = http.Server | https.Server;

export type SocketHandler = (
  socket: SocketWithInfo,
  request: MessageWithInfo
) => void;
