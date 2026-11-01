import type {
    APIEmbed,
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Interaction,
    StringSelectMenuInteraction,
} from 'discord.js';

type ResponseMethod = 'reply' | 'deferReply' | 'editReply' | 'followUp' | 'update' | 'respond';

export interface CommandResponse {
    method: ResponseMethod;
    // Whatever the command passed: a string, reply options, or autocomplete choices.
    payload: unknown;
}

interface FakeOptions {
    commandName?: string;
    subcommand?: string;
    strings?: Record<string, string>;
    channel?: unknown;
    role?: unknown;
    focused?: string;
    customId?: string;
    values?: string[];
    userId?: string;
    guildId?: string;
    guild?: unknown;
    // Makes the given response method reject, like a Discord API error would.
    failOn?: ResponseMethod;
}

type Kind = 'chatInput' | 'autocomplete' | 'button' | 'selectMenu' | 'other';

export interface FakeInteraction<T> {
    interaction: T;
    responses: CommandResponse[];
}

const create = <T>(kind: Kind, options: FakeOptions): FakeInteraction<T> => {
    const responses: CommandResponse[] = [];
    const state = { replied: false, deferred: false };

    const respond =
        (method: ResponseMethod) =>
        async (payload: unknown): Promise<void> => {
            if (options.failOn === method) throw new Error(`${method} failed`);
            responses.push({ method, payload });
            if (method === 'reply' || method === 'update') state.replied = true;
            if (method === 'deferReply') state.deferred = true;
        };

    const interaction = {
        commandName: options.commandName ?? '',
        customId: options.customId ?? '',
        values: options.values ?? [],
        guildId: options.guildId ?? 'guild-1',
        guild: options.guild ?? null,
        user: { id: options.userId ?? 'user-1', tag: 'user#0001' },
        get replied(): boolean {
            return state.replied;
        },
        get deferred(): boolean {
            return state.deferred;
        },
        isAutocomplete: (): boolean => kind === 'autocomplete',
        isButton: (): boolean => kind === 'button',
        isStringSelectMenu: (): boolean => kind === 'selectMenu',
        isChatInputCommand: (): boolean => kind === 'chatInput',
        options: {
            getSubcommand: (): string => options.subcommand ?? '',
            getString: (name: string, required = false): string | null => {
                const value = options.strings?.[name] ?? null;
                if (required && value === null) throw new TypeError(`Missing option ${name}`);
                return value;
            },
            getChannel: (): unknown => options.channel ?? null,
            getRole: (): unknown => options.role ?? null,
            getFocused: (): string => options.focused ?? '',
        },
        reply: respond('reply'),
        deferReply: respond('deferReply'),
        editReply: respond('editReply'),
        followUp: respond('followUp'),
        update: respond('update'),
        respond: respond('respond'),
    };

    return { interaction: interaction as unknown as T, responses };
};

export const chatInput = (
    options: FakeOptions = {},
): FakeInteraction<ChatInputCommandInteraction> => create('chatInput', options);

export const autocomplete = (options: FakeOptions = {}): FakeInteraction<AutocompleteInteraction> =>
    create('autocomplete', options);

export const button = (options: FakeOptions = {}): FakeInteraction<ButtonInteraction> =>
    create('button', options);

export const selectMenu = (
    options: FakeOptions = {},
): FakeInteraction<StringSelectMenuInteraction> => create('selectMenu', options);

// An interaction of a kind the bot doesn't handle, such as a modal submit.
export const otherInteraction = (): FakeInteraction<Interaction> => create('other', {});

// The single response a command sent, failing the test if there wasn't exactly one.
export const onlyResponse = (responses: CommandResponse[]): CommandResponse => {
    if (responses.length !== 1) {
        throw new Error(
            `Expected 1 response, got ${responses.length}: ${JSON.stringify(responses)}`,
        );
    }
    return responses[0] as CommandResponse;
};

interface ReplyPayload {
    content?: string;
    embeds?: EmbedBuilder[];
    components?: { toJSON: () => unknown }[];
    flags?: unknown;
}

export const payloadOf = (response: CommandResponse): ReplyPayload =>
    typeof response.payload === 'string'
        ? { content: response.payload }
        : (response.payload as ReplyPayload);

export const embedOf = (response: CommandResponse): APIEmbed => {
    const embed = payloadOf(response).embeds?.[0];
    if (!embed) throw new Error('Response has no embed');
    return embed.toJSON();
};

// The buttons or select menus in a response, as plain JSON.
export const componentsOf = (
    response: CommandResponse,
): { components: Record<string, unknown>[] }[] =>
    (payloadOf(response).components ?? []).map(
        (row) => row.toJSON() as { components: Record<string, unknown>[] },
    );
