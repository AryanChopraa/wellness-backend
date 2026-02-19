import mongoose from 'mongoose';
import { User } from '../src/models/User';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        console.log(MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully.');

        const defaultLimit = 100;

        // Find users where messageLimit is missing
        const usersToUpdate = await User.find({
            $or: [
                { messageLimit: { $exists: false } },
                { messageLimit: null }
            ]
        });

        console.log(`Found ${usersToUpdate.length} users to update.`);

        if (usersToUpdate.length > 0) {
            const result = await User.updateMany(
                {
                    $or: [
                        { messageLimit: { $exists: false } },
                        { messageLimit: null }
                    ]
                },
                { $set: { messageLimit: defaultLimit } }
            );
            console.log(`Successfully updated ${result.modifiedCount} users.`);
        } else {
            console.log('No users need migration.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

migrate();
