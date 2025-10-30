import { t } from 'i18next';
import { Plus, Globe } from 'lucide-react';
import { memo, useState } from 'react';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';

import { AutoFormFieldWrapper } from '@/app/builder/piece-properties/auto-form-field-wrapper';
import { CreateOrEditConnectionDialog } from '@/app/connections/create-edit-connection-dialog';
import { SearchableSelect } from '@/components/custom/searchable-select';
import { InvalidStepIcon } from '@/components/custom/alert-icon';
import { Button } from '@/components/ui/button';
import { FormField, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectAction,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { appConnectionsQueries } from '@/features/connections/lib/app-connections-hooks';
import { authenticationSession } from '@/lib/authentication-session';
import {
  PieceMetadataModel,
  PieceMetadataModelSummary,
} from '@activepieces/pieces-framework';
import {
  AppConnectionScope,
  AppConnectionWithoutSensitiveData,
  PieceAction,
  PieceTrigger,
  isNil,
} from '@activepieces/shared';

type ConnectionSelectProps = {
  disabled: boolean;
  piece: PieceMetadataModelSummary | PieceMetadataModel;
  isTrigger: boolean;
  scopes: string[];
};
const addBrackets = (str: string) => `{{connections['${str}']}}`;
const removeBrackets = (str: string | undefined) => {
  if (isNil(str)) {
    return undefined;
  }
  return str.replace(
    /\{\{connections\['(.*?)'\]\}\}/g,
    (_, connectionName) => connectionName,
  );
};

const validateConnectionScopes = (
  connection: AppConnectionWithoutSensitiveData | null,
  requiredScopes: string[] | undefined,
): boolean => {
  if (!requiredScopes || requiredScopes.length === 0) {
    console.log('No required scopes, connection is valid');
    return true;
  }
  if (connection === null) {
    console.log('No connection selected, connection is invalid');
    return false;
  }
  console.log(
    'Validating connection scopes:',
    connection.oAuthScopes,
    'against required scopes:',
    requiredScopes,
  );
  const connectionScopes: string[] = connection.oAuthScopes || [];
  return requiredScopes.every((scope) => connectionScopes.includes(scope));
};

const ConnectionSelect = memo((params: ConnectionSelectProps) => {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [selectConnectionOpen, setSelectConnectionOpen] = useState(false);
  const [reconnectConnection, setReconnectConnection] =
    useState<AppConnectionWithoutSensitiveData | null>(null);
  const form = useFormContext<PieceAction | PieceTrigger>();

  const {
    data: connections,
    isLoading: isLoadingConnections,
    refetch,
  } = appConnectionsQueries.useAppConnections({
    request: {
      pieceName: params.piece.name,
      projectId: authenticationSession.getProjectId()!,
      limit: 1000,
    },
    extraKeys: [params.piece.name, authenticationSession.getProjectId()!],
    staleTime: 0,
  });

  const selectedConnection = connections?.data?.find(
    (connection) =>
      connection.externalId ===
      removeBrackets(form.getValues().settings.input.auth ?? ''),
  );

  const isGlobalConnection =
    selectedConnection?.scope === AppConnectionScope.PLATFORM;
  return (
    <FormField
      control={form.control}
      key={form.getValues().settings.input.auth}
      name={'settings.input.auth'}
      render={({ field }) => (
        <>
          {isLoadingConnections && (
            <div className="flex flex-col gap-2">
              <FormLabel>
                {t('Connections')} <span className="text-destructive">*</span>
              </FormLabel>
              <SearchableSelect
                options={[]}
                disabled={true}
                loading={isLoadingConnections}
                placeholder={t('Select a connection')}
                value={field.value as React.Key}
                onChange={(value) => field.onChange(value)}
                showDeselect={false}
                onRefresh={() => {}}
                showRefresh={false}
              />
            </div>
          )}
          {!isLoadingConnections && (
            <AutoFormFieldWrapper
              property={params.piece.auth!}
              propertyName="auth"
              field={field as unknown as ControllerRenderProps}
              disabled={params.disabled}
              hideDescription={true}
              inputName="settings.input.auth"
              allowDynamicValues={!params.isTrigger}
            >
              <CreateOrEditConnectionDialog
                reconnectConnection={reconnectConnection}
                isGlobalConnection={isGlobalConnection}
                piece={params.piece}
                extendedScopes={params.scopes}
                key={`CreateOrEditConnectionDialog-open-${connectionDialogOpen}`}
                open={connectionDialogOpen}
                setOpen={(open, connection) => {
                  setConnectionDialogOpen(open);
                  if (connection) {
                    refetch();
                    field.onChange(addBrackets(connection.externalId));
                  }
                }}
              ></CreateOrEditConnectionDialog>
              <Select
                open={selectConnectionOpen}
                onOpenChange={setSelectConnectionOpen}
                defaultValue={field.value as string | undefined}
                onValueChange={field.onChange}
                disabled={params.disabled}
              >
                <div className="relative">
                  {field.value && !field.disabled && 
                    validateConnectionScopes(
                      selectedConnection ?? null,
                      params.scopes,
                    ) && (
                    <>
                      {connections?.data?.find(
                        (connection) =>
                          connection.externalId ===
                            removeBrackets(field.value) &&
                          connection.scope !== AppConnectionScope.PLATFORM,
                      ) && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="z-50 absolute right-8 top-2 "
                          onClick={(e) => {
                            e.stopPropagation();
                            setReconnectConnection(selectedConnection ?? null);
                            setSelectConnectionOpen(false);
                            setConnectionDialogOpen(true);
                          }}
                        >
                          {t('Reconnect')}
                        </Button>
                      )}
                    </>
                  )}
                  {field.value && !field.disabled && 
                    !validateConnectionScopes(
                      selectedConnection ?? null,
                      params.scopes,
                    ) && (
                    <>
                      {connections?.data?.find(
                        (connection) =>
                          connection.externalId ===
                            removeBrackets(field.value) &&
                          connection.scope !== AppConnectionScope.PLATFORM,
                      ) && (
                        <div className='absolute right-8 flex top-2'>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="">
                                <InvalidStepIcon
                                  size={16}
                                  viewBox="0 0 16 15"
                                  className="stroke-0 animate-fade"
                                ></InvalidStepIcon>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              {t('Extra Scopes Required')}
                            </TooltipContent>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="xs"
                            className=""
                            onClick={(e) => {
                              e.stopPropagation();
                              setReconnectConnection(selectedConnection ?? null);
                              setSelectConnectionOpen(false);
                              setConnectionDialogOpen(true);
                            }}
                          >
                            {t('Update Connection')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  <SelectTrigger className="flex gap-2 items-center">
                    <SelectValue
                      className="truncate flex-grow flex-shrink"
                      placeholder={t('Select a connection')}
                      data-testid="select-connection-value"
                    >
                      {!isNil(field.value) &&
                      !isNil(
                        connections?.data?.find(
                          (connection) =>
                            connection.externalId ===
                            removeBrackets(field.value),
                        ),
                      ) ? (
                        <div className="truncate flex-grow flex-shrink flex items-center gap-2">
                          {connections?.data?.find(
                            (connection) =>
                              connection.externalId ===
                              removeBrackets(field.value),
                          )?.scope === AppConnectionScope.PLATFORM && (
                            <Globe size={16} className="shrink-0" />
                          )}
                          {
                            connections?.data?.find(
                              (connection) =>
                                connection.externalId ===
                                removeBrackets(field.value),
                            )?.displayName
                          }
                        </div>
                      ) : null}
                    </SelectValue>
                    <div className="grow"></div>
                    {field.value &&
                      connections?.data?.find(
                        (connection) =>
                          connection.externalId ===
                            removeBrackets(field.value) &&
                          connection.scope !== AppConnectionScope.PLATFORM,
                      ) && (
                        <span
                          role="button"
                          className="z-50 opacity-0 pointer-events-none"
                        >
                          {t('Reconnect')}
                        </span>
                      )}
                  </SelectTrigger>
                </div>

                <SelectContent>
                  <SelectAction
                    onClick={() => {
                      setSelectConnectionOpen(false);
                      setReconnectConnection(null);
                      setConnectionDialogOpen(true);
                    }}
                  >
                    <span className="flex items-center gap-1 text-primary w-full">
                      <Plus size={16} />
                      {t('Create Connection')}
                    </span>
                  </SelectAction>

                  {connections &&
                    connections.data &&
                    connections.data?.map((connection) => {
                      return (
                        <SelectItem
                          value={addBrackets(connection.externalId)}
                          key={connection.externalId}
                        >
                          <div className="flex items-center gap-2">
                            {connection.scope ===
                              AppConnectionScope.PLATFORM && (
                              <Globe size={16} className="shrink-0" />
                            )}
                            {connection.displayName}
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </AutoFormFieldWrapper>
          )}
        </>
      )}
    ></FormField>
  );
});

ConnectionSelect.displayName = 'ConnectionSelect';
export { ConnectionSelect };
