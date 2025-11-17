const axios = require('axios');
const config = require('../config');

const DISCORD_API = 'https://discord.com/api/v10';

// Create DM channel with user
async function createDMChannel(botToken, userId) {
    try {
        const response = await axios.post(
            `${DISCORD_API}/users/@me/channels`,
            { recipient_id: userId },
            {
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        if (response.data && response.data.id) {
            return response.data.id;
        }
        return null;
    } catch (error) {
        console.error('Failed to create DM channel:', error.message);
        if (error.response) {
            console.error('Discord API response:', error.response.status, error.response.data);
        }
        return null;
    }
}

// Send Discord DM
async function sendDiscordDM(botToken, userId, data) {
    if (!botToken || !botToken.trim() || !userId || !userId.trim()) {
        console.warn('Discord bot token or user ID is not provided');
        return false;
    }

    try {
        // Create or get DM channel
        const channelId = await createDMChannel(botToken, userId);
        if (!channelId) {
            console.error('Failed to create DM channel');
            return false;
        }

        const { endpointName, endpointUrl, filePath, diffDetected, status, errorMessage } = data;
        
        // Pick color: red for error, orange for change, green for no change
        const color = status === 'error' ? 15158332 : (diffDetected ? 15844367 : 3066993);
        
        const embed = {
            title: status === 'error' 
                ? `❌ Error: ${endpointName}` 
                : diffDetected 
                    ? `⚠️ Data Changed: ${endpointName}` 
                    : `✅ Data Checked: ${endpointName}`,
            description: status === 'error' 
                ? `An error occurred while fetching data from the endpoint.`
                : diffDetected 
                    ? `Data has changed since the last check.`
                    : `Data checked successfully. No changes detected.`,
            color: color,
            fields: [
                {
                    name: 'Endpoint',
                    value: endpointName || 'N/A',
                    inline: true
                },
                {
                    name: 'URL',
                    value: endpointUrl || 'N/A',
                    inline: false
                },
                {
                    name: 'App URL',
                    value: `[View in API Exporter](${config.APP_URL})`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'API Exporter'
            }
        };

        // Add file path if available
        if (filePath) {
            embed.fields.push({
                name: 'File',
                value: filePath,
                inline: false
            });
        }

        // Add error message if available
        if (errorMessage) {
            embed.fields.push({
                name: 'Error',
                value: errorMessage.substring(0, 1024),
                inline: false
            });
        }

        // Send message to DM channel
        const payload = {
            embeds: [embed]
        };

        const response = await axios.post(
            `${DISCORD_API}/channels/${channelId}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.status === 200 || response.status === 201) {
            console.log(`Discord DM sent successfully for endpoint: ${endpointName}`);
            return true;
        } else {
            console.warn(`Discord API returned unexpected status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`Failed to send Discord DM:`, error.message);
        if (error.response) {
            console.error(`Discord API response:`, error.response.status, error.response.data);
        }
        return false;
    }
}

// Send Discord webhook notification
async function sendDiscordWebhook(webhookUrl, data) {
    if (!webhookUrl || !webhookUrl.trim()) {
        console.warn('Discord webhook URL is not provided');
        return false;
    }

    try {
        const { endpointName, endpointUrl, filePath, diffDetected, status, errorMessage } = data;
        
        // Color: red=error, orange=change, green=no change
        const color = status === 'error' ? 15158332 : (diffDetected ? 15844367 : 3066993);
        
        const embed = {
            title: status === 'error' 
                ? `❌ Error: ${endpointName}` 
                : diffDetected 
                    ? `⚠️ Data Changed: ${endpointName}` 
                    : `✅ Data Checked: ${endpointName}`,
            description: status === 'error' 
                ? `An error occurred while fetching data from the endpoint.`
                : diffDetected 
                    ? `Data has changed since the last check.`
                    : `Data checked successfully. No changes detected.`,
            color: color,
            fields: [
                {
                    name: 'Endpoint',
                    value: endpointName || 'N/A',
                    inline: true
                },
                {
                    name: 'URL',
                    value: endpointUrl || 'N/A',
                    inline: false
                },
                {
                    name: 'App URL',
                    value: `[View in API Exporter](${config.APP_URL})`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'API Exporter'
            }
        };

        // Add file path if available
        if (filePath) {
            embed.fields.push({
                name: 'File',
                value: filePath,
                inline: false
            });
        }

        // Add error message if available
        if (errorMessage) {
            embed.fields.push({
                name: 'Error',
                value: errorMessage.substring(0, 1024), // Discord limit
                inline: false
            });
        }

        // Send webhook
        const payload = {
            embeds: [embed]
        };

        const response = await axios.post(webhookUrl, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.status === 200 || response.status === 204) {
            console.log(`Discord notification sent successfully for endpoint: ${endpointName}`);
            return true;
        } else {
            console.warn(`Discord webhook returned unexpected status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`Failed to send Discord notification:`, error.message);
        if (error.response) {
            console.error(`Discord API response:`, error.response.status, error.response.data);
        }
        return false;
    }
}

// Main notification function - picks webhook or DM automatically
async function sendDiscordNotification(options, data) {
    if (options.webhookUrl) {
        return await sendDiscordWebhook(options.webhookUrl, data);
    }
    
    if (options.botToken && options.userId) {
        return await sendDiscordDM(options.botToken, options.userId, data);
    }
    
    console.warn('No valid Discord notification method provided');
    return false;
}

module.exports = {
    sendDiscordNotification,
    sendDiscordWebhook,
    sendDiscordDM
};

