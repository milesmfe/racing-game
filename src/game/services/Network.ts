import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';
import { EventBus } from '../EventBus';

export type PlayerInfo = {
    id: string;
    isPlayer: boolean;
};

export class Network {
    private socket: Socket;
    private peers: { [key: string]: Peer.Instance } = {};
    public isHost: boolean = false;
    public localPlayerId: string | null = null;

    constructor() {
        // In a real-world scenario, you would use a configuration file for the server URL
        this.socket = io(window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin);

        this.setupSocketEvents();
    }

    private setupSocketEvents() {
        this.socket.on('connect', () => {
            this.localPlayerId = this.socket.id ?? null;
            console.log(`Connected to signalling server! My ID is ${this.localPlayerId}`);
            EventBus.emit('network-connected');
        });

        this.socket.on('roomCreated', (data: { roomName: string, players: { [id: string]: PlayerInfo } }) => {
            console.log(`Room "${data.roomName}" created. You are the host.`);
            this.isHost = true;
            EventBus.emit('network-room-created', data);
            if (data.players) {
                EventBus.emit('network-playerList', Object.values(data.players));
            }
        });

        this.socket.on('joinedRoom', (data: { roomName: string, hostId: string, players: { [id: string]: PlayerInfo } }) => {
            console.log(`Joined room "${data.roomName}". Passively waiting for connections from existing peers.`);
            this.isHost = false;
            EventBus.emit('network-joined-room', data);
            if (data.players) {
                EventBus.emit('network-playerList', Object.values(data.players));
                // **FIX:** The newly joined client should NOT initiate connections.
                // It will passively wait for 'signal' events from existing peers,
                // and the `createPeer(..., false)` logic in the 'signal' handler will create the connection.
            }
        });

        this.socket.on('playerList', (players: PlayerInfo[]) => {
            EventBus.emit('network-playerList', players);
        });

        this.socket.on('roomList', (rooms: { name: string, playerCount: number }[]) => {
            EventBus.emit('network-roomList', rooms);
        });

        this.socket.on('newPeer', (peerId: string) => {
            // This event is received by clients already in the room when a new client joins.
            // The existing client is responsible for initiating the connection.
            if (peerId !== this.localPlayerId) {
                console.log(`A new peer has joined: ${peerId}. I will initiate connection.`);
                const peer = this.createPeer(peerId, true);
                this.peers[peerId] = peer;
            }
        });

        this.socket.on('signal', (data: { from: string, signal: any }) => {
            if (this.peers[data.from]) {
                // If a peer instance already exists, just signal it.
                this.peers[data.from].signal(data.signal);
            } else {
                // This is the crucial part for the non-initiator.
                // A signal has arrived from a peer we don't have an instance for yet.
                // This means they initiated the connection, so we create our side of it as the receiver.
                console.log(`Received signal from new peer ${data.from}. Creating non-initiator peer.`);
                const peer = this.createPeer(data.from, false);
                this.peers[data.from] = peer;
                peer.signal(data.signal); // Now we can process the signal we just received.
            }
        });

        this.socket.on('peerDisconnect', (peerId: string) => {
            console.log(`Peer ${peerId} has disconnected.`);
            if (this.peers[peerId]) {
                this.peers[peerId].destroy();
                delete this.peers[peerId];
            }
        });

        this.socket.on('gameStarted', (players: { [id: string]: PlayerInfo }) => {
            EventBus.emit('game-start', { network: this, players });
        });

        this.socket.on('error', (message: string) => {
            console.error('Server error:', message);
            EventBus.emit('network-error', message);
        });
    }

    private createPeer(targetId: string, initiator: boolean): Peer.Instance {
        console.log(`Creating peer connection to ${targetId}, initiator: ${initiator}`);
        const peer = new Peer({ initiator, trickle: false });

        peer.on('signal', (signal) => {
            this.socket.emit('signal', { to: targetId, signal });
        });

        peer.on('connect', () => {
            console.log(`✅ Successfully connected to peer: ${targetId}`);
        });

        peer.on('data', (data: any) => {
            try {
                const message = JSON.parse(data.toString());
                // console.log(`[NETWORK] Received message of type "${message.type}" from peer.`);
                EventBus.emit(message.type, { from: targetId, ...message.payload });
            } catch (error) {
                console.error('[NETWORK] Failed to parse incoming peer data:', error);
            }
        });

        peer.on('error', (err) => {
            console.error(`[NETWORK] Peer connection error with ${targetId}:`, err.message);
        });

        peer.on('close', () => {
            console.log(`[NETWORK] Connection closed with ${targetId}`);
            delete this.peers[targetId];
        });

        return peer;
    }

    public broadcastToPeers(type: string, payload: any) {
        const message = JSON.stringify({ type, payload });
        let sentCount = 0;
        for (const peerId in this.peers) {
            const peer = this.peers[peerId];
            if (peer.connected) {
                peer.send(message);
                sentCount++;
            } else {
                console.warn(`Peer ${peerId} is not connected, message of type "${type}" was not sent.`);
            }
        }
        if (Object.keys(this.peers).length > 0) {
            console.log(`Broadcasted '${type}' to ${sentCount}/${Object.keys(this.peers).length} connected peers.`);
        }
    }

    public sendToHost(type: string, payload: any) {
        if (this.isHost) {
            // This logic is now handled in GameScene to prevent network overhead
            console.error("Host should not use sendToHost.");
            return;
        }

        // The host is the peer that is NOT the local player
        const hostId = Object.keys(this.peers).find(id => id !== this.localPlayerId);

        if (hostId && this.peers[hostId] && this.peers[hostId].connected) {
            const message = JSON.stringify({ type, payload });
            this.peers[hostId].send(message);
        } else {
            console.warn(`Host peer is not available or not connected. Cannot send message type "${type}".`);
        }
    }

    public createRoom(roomName: string, isHostPlayer: boolean) {
        this.socket.emit('createRoom', { roomName, isPlayer: isHostPlayer });
    }

    public joinRoom(roomName: string) {
        // For now, anyone joining is a player. This could be a checkbox in the UI.
        this.socket.emit('joinRoom', { roomName, isPlayer: true });
    }

    public startGame(roomName: string) {
        if (!this.isHost) return;
        this.socket.emit('startGame', { roomName });
    }
}

